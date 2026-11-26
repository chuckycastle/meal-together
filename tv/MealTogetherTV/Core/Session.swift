import Foundation
import Observation

/// The signed-in account and its families
@Observable
final class Session {
    enum Phase { case launching, signedOut, signedIn }

    private(set) var phase: Phase = .launching
    private(set) var user: User?
    private(set) var families: [Family] = []
    private(set) var hasLoaded = false
    private(set) var loadError: String?
    private(set) var activeFamilyID: Int?

    let api: APIClient

    private static let familyKey = "activeFamilyID"

    init(api: APIClient) {
        self.api = api
        let stored = UserDefaults.standard.integer(forKey: Self.familyKey)
        activeFamilyID = stored > 0 ? stored : nil
        api.onSessionExpired = { [weak self] in self?.clear() }
    }

    var activeFamily: Family? {
        families.first { $0.id == activeFamilyID } ?? families.first
    }

    func start() async {
        guard phase == .launching else { return }
        guard api.tokens != nil else {
            phase = .signedOut
            return
        }
        phase = .signedIn
        await load()
    }

    /// Fetch the profile and families. Keeps what is already loaded when the request fails.
    func load() async {
        do {
            let me: UserResponse = try await api.request("GET", "/api/auth/me")
            let list: FamiliesResponse = try await api.request("GET", "/api/families")
            user = me.user
            families = list.families
            hasLoaded = true
            loadError = nil
        } catch let error as APIError where error.status == 401 {
            // The client has already cleared the session
            _ = error
        } catch is CancellationError {
            return
        } catch let error as URLError where error.code == .cancelled {
            return
        } catch {
            loadError = Self.describe(error)
        }
    }

    /// Load after signing in. The sign-in screen that started the request
    /// disappears when the phase changes, which cancels its task; this load
    /// runs in its own task so it finishes anyway.
    private func loadAfterSignIn() async {
        await Task { await self.load() }.value
    }

    func signIn(email: String, password: String) async throws {
        let response: SignInResponse = try await api.request(
            "POST",
            "/api/auth/login",
            body: ["email": email, "password": password],
            authorized: false
        )
        api.setTokens(Tokens(accessToken: response.accessToken, refreshToken: response.refreshToken))
        user = response.user
        phase = .signedIn
        await loadAfterSignIn()
    }

    /// Ask the server for a code to show on screen
    func startDeviceLogin() async throws -> DeviceLogin {
        try await api.request("POST", "/api/auth/device", authorized: false)
    }

    /// Check whether a phone has approved the code. Returns true once signed in.
    /// Throws an `APIError` with status 403 when it was declined and 410 when it expired.
    func finishDeviceLogin(_ login: DeviceLogin) async throws -> Bool {
        let answer: DeviceLoginAnswer = try await api.request(
            "POST",
            "/api/auth/device/token",
            body: ["device_code": login.deviceCode],
            authorized: false
        )
        guard answer.status == "approved",
              let accessToken = answer.accessToken,
              let refreshToken = answer.refreshToken
        else { return false }

        api.setTokens(Tokens(accessToken: accessToken, refreshToken: refreshToken))
        user = answer.user
        phase = .signedIn
        await loadAfterSignIn()
        return true
    }

    func signOut() {
        clear()
    }

    func selectFamily(_ id: Int) {
        activeFamilyID = id
        UserDefaults.standard.set(id, forKey: Self.familyKey)
    }

    private func clear() {
        api.setTokens(nil)
        user = nil
        families = []
        hasLoaded = false
        loadError = nil
        phase = .signedOut
    }

    static func describe(_ error: Error) -> String {
        if let api = error as? APIError { return api.message }
        if error is URLError { return "The server cannot be reached. Check the network connection." }
        if error is DecodingError { return "The server sent a reply this version cannot read." }
        return error.localizedDescription
    }
}
