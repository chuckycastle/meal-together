import Foundation
import Security

/// Stores the sign-in tokens as one generic password item
nonisolated enum Keychain {
    private static let service = "io.chuckycastle.mealtogether"
    private static let account = "tokens"

    private static var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    static func loadTokens() -> Tokens? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data
        else { return nil }
        return try? JSONDecoder().decode(Tokens.self, from: data)
    }

    static func saveTokens(_ tokens: Tokens?) {
        SecItemDelete(baseQuery as CFDictionary)
        guard let tokens, let data = try? JSONEncoder().encode(tokens) else { return }

        var item = baseQuery
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(item as CFDictionary, nil)
    }
}
