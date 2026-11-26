import SwiftUI

/// Sign-in. The TV shows a QR code and a short code; a phone that is signed
/// in to MealTogether approves it. A password form is the fallback.
struct SignInView: View {
    private enum Mode { case code, password }

    @Environment(Session.self) private var session
    @Environment(\.palette) private var palette
    @State private var mode: Mode = .code

    var body: some View {
        HStack(spacing: 70) {
            VStack(alignment: .leading, spacing: 22) {
                Text("MealTogether")
                    .font(.marker(88))
                    .lineLimit(1)
                    .fixedSize()
                Text("The kitchen board for this TV: the meal schedule, who is cooking what, and every running timer.")
                    .font(.text(33))
                    .foregroundStyle(palette.ink2)
                    .frame(maxWidth: 620, alignment: .leading)

                Button(mode == .code ? "Use a password instead" : "Use the QR code instead") {
                    mode = mode == .code ? .password : .code
                }
                .buttonStyle(PillButtonStyle(size: 27))
                .padding(.top, 26)
            }

            Group {
                switch mode {
                case .code: CodeSignIn()
                case .password: PasswordSignIn()
                }
            }
            .frame(width: 800)
        }
        .padding(80)
        #if DEBUG && targetEnvironment(simulator)
        .onAppear {
            // Simulator runs that pass an email go straight to the password form
            if ProcessInfo.processInfo.environment["MT_EMAIL"] != nil { mode = .password }
        }
        #endif
    }
}

/// Shows the code, waits for a phone to approve it, and draws a new one when it expires
private struct CodeSignIn: View {
    @Environment(Session.self) private var session
    @Environment(\.palette) private var palette
    @State private var login: DeviceLogin?
    @State private var message: String?
    @State private var unavailable: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 26) {
            if let login {
                HStack(alignment: .center, spacing: 36) {
                    QRCodeView(text: login.verificationUrlComplete)
                        .frame(width: 340, height: 340)
                        .accessibilityLabel("QR code that opens the sign-in page")

                    VStack(alignment: .leading, spacing: 14) {
                        Text("Scan with a phone")
                            .font(.marker(42))
                        Text("Open the camera, point it at the code, then approve this TV.")
                            .font(.text(27))
                            .foregroundStyle(palette.ink2)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Or go to \(Self.shortAddress(login.verificationUrl)) and enter")
                        .font(.text(27))
                        .foregroundStyle(palette.ink2)
                    Text(login.userCode)
                        .font(.marker(84))
                        .tightLine(84)
                        .kerning(4)
                        .accessibilityLabel(login.userCode.map(String.init).joined(separator: " "))
                }
            } else if let unavailable {
                Text(unavailable)
                    .font(.text(29))
                    .foregroundStyle(palette.ink2)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 320)
            }

            if let message {
                Text(message)
                    .font(.text(27, weight: .semibold))
                    .foregroundStyle(palette.hot)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .task { await run() }
    }

    /// "https://mealtogether.chuckycastle.io/link" -> "mealtogether.chuckycastle.io/link"
    private static func shortAddress(_ address: String) -> String {
        address.replacing(/^https?:\/\//, with: "")
    }

    /// Keep a code on screen until one is approved or this view goes away
    private func run() async {
        while !Task.isCancelled, session.phase == .signedOut {
            do {
                let started = try await session.startDeviceLogin()
                login = started
                unavailable = nil
                if try await wait(for: started) { return }
                // The code ran out; draw another
            } catch is CancellationError {
                return
            } catch let error as URLError where error.code == .cancelled {
                return
            } catch let error as APIError where error.status == 403 {
                message = error.message
            } catch let error as APIError where error.status == 410 {
                // Expired on the server; draw another
                _ = error
            } catch {
                login = nil
                unavailable = "\(Session.describe(error)) Trying again shortly. A password also works."
                try? await Task.sleep(for: .seconds(8))
            }
        }
    }

    /// Poll until the phone answers. Returns true when signed in, false when the code ran out.
    private func wait(for started: DeviceLogin) async throws -> Bool {
        let deadline = ContinuousClock.now + .seconds(started.expiresIn)
        let interval = Duration.seconds(max(2, started.interval))
        while ContinuousClock.now < deadline {
            try await Task.sleep(for: interval)
            do {
                if try await session.finishDeviceLogin(started) { return true }
            } catch let error as URLError where error.code != .cancelled {
                // A dropped request: keep the code and try again
                _ = error
            }
        }
        return false
    }
}

private struct PasswordSignIn: View {
    @Environment(Session.self) private var session
    @Environment(\.palette) private var palette
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @State private var working = false

    var body: some View {
        VStack(alignment: .leading, spacing: 26) {
            TextField("Email", text: $email)
                .frame(maxWidth: 700)
                .textContentType(.username)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            SecureField("Password", text: $password)
                .textContentType(.password)
                .frame(maxWidth: 700)

            Button {
                Task { await submit() }
            } label: {
                Text(working ? "Signing in" : "Sign in")
            }
            .buttonStyle(PillButtonStyle(kind: .primary, size: 31))
            .disabled(working || email.isEmpty || password.isEmpty)

            if let error {
                Text(error)
                    .font(.text(27, weight: .semibold))
                    .foregroundStyle(palette.hot)
            }

            Text("Use the account from mealtogether.chuckycastle.io.")
                .font(.text(25))
                .foregroundStyle(palette.ink3)
        }
        #if DEBUG && targetEnvironment(simulator)
        .onAppear {
            // Sign in without the keyboard for simulator runs against a local server
            let environment = ProcessInfo.processInfo.environment
            if let email = environment["MT_EMAIL"], let password = environment["MT_PASSWORD"] {
                self.email = email
                self.password = password
                Task { await submit() }
            }
        }
        #endif
    }

    private func submit() async {
        working = true
        error = nil
        do {
            try await session.signIn(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
        } catch {
            self.error = Session.describe(error)
        }
        working = false
    }
}
