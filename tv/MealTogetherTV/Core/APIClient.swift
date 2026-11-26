import Foundation

nonisolated struct APIError: LocalizedError, Sendable {
    let status: Int
    let message: String

    var errorDescription: String? { message }
}

nonisolated struct Tokens: Codable, Sendable {
    var accessToken: String
    var refreshToken: String
}

nonisolated enum ISODate {
    /// Parse the server's date text. The API writes ISO 8601 in UTC with
    /// milliseconds; rows written by other tools may use a space separator,
    /// more fractional digits, or no time zone, which is read as UTC.
    static func parse(_ text: String) -> Date? {
        var value = text.trimmingCharacters(in: .whitespaces)
        if let space = value.firstIndex(of: " ") {
            value.replaceSubrange(space...space, with: "T")
        }
        value = value.replacing(/(\.\d{3})\d+/) { $0.output.1 }
        if value.firstMatch(of: /(Z|[+-]\d{2}:?\d{2})$/) == nil {
            value += "Z"
        }
        if let date = try? Date(value, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true)) {
            return date
        }
        return try? Date(value, strategy: Date.ISO8601FormatStyle())
    }
}

private nonisolated struct ErrorBody: Decodable {
    let error: String
}

/// JSON client for the MealTogether API. Holds the signed-in tokens and
/// renews the access token once when a request is rejected.
final class APIClient {
    let baseURL: URL
    private(set) var tokens: Tokens?
    /// Called when the refresh token is no longer accepted
    var onSessionExpired: (() -> Void)?

    private let urlSession: URLSession
    private var refreshing: Task<Void, Error>?

    init(baseURL: URL) {
        self.baseURL = baseURL
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 15
        urlSession = URLSession(configuration: configuration)
        tokens = Keychain.loadTokens()
    }

    static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let text = try container.decode(String.self)
            guard let date = ISODate.parse(text) else {
                throw DecodingError.dataCorruptedError(in: container, debugDescription: "Not an ISO 8601 date: \(text)")
            }
            return date
        }
        return decoder
    }

    func setTokens(_ value: Tokens?) {
        tokens = value
        Keychain.saveTokens(value)
    }

    func request<Response: Decodable>(
        _ method: String,
        _ path: String,
        query: [String: String] = [:],
        body: [String: Any]? = nil,
        authorized: Bool = true
    ) async throws -> Response {
        let payload = try body.map { try JSONSerialization.data(withJSONObject: $0) }
        let data: Data
        do {
            data = try await send(method, path, query, payload, token: authorized ? tokens?.accessToken : nil)
        } catch let error as APIError where error.status == 401 && authorized {
            try await refresh()
            data = try await send(method, path, query, payload, token: tokens?.accessToken)
        }
        return try Self.makeDecoder().decode(Response.self, from: data)
    }

    /// Renew the access token. Concurrent callers share one request.
    private func refresh() async throws {
        if let refreshing {
            return try await refreshing.value
        }
        guard let refreshToken = tokens?.refreshToken else {
            onSessionExpired?()
            throw APIError(status: 401, message: "Sign in again")
        }

        let task = Task {
            let data = try await send("POST", "/api/auth/refresh", [:], nil, token: refreshToken)
            let renewed = try Self.makeDecoder().decode(RefreshResponse.self, from: data)
            setTokens(Tokens(accessToken: renewed.accessToken, refreshToken: refreshToken))
        }
        refreshing = task
        defer { refreshing = nil }

        do {
            try await task.value
        } catch let error as APIError where error.status == 401 {
            onSessionExpired?()
            throw error
        }
    }

    private func send(
        _ method: String,
        _ path: String,
        _ query: [String: String],
        _ body: Data?,
        token: String?
    ) async throws -> Data {
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.path = path
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (data, response) = try await urlSession.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(status: 0, message: "No response from the server")
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            throw APIError(status: http.statusCode, message: message ?? "Request failed (\(http.statusCode))")
        }
        return data
    }
}
