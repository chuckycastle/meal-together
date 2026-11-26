import Foundation

// API payloads. Keys arrive in snake_case and are converted by the decoder.
// Fields the app does not need are left out; fields that can be null are optional.

nonisolated enum MarkerColor: String, Codable, CaseIterable, Sendable {
    case red, orange, brown, green, tan, ink

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = MarkerColor(rawValue: raw) ?? .ink
    }

    /// Pick a marker color from a name, the way the web app does
    static func guess(for title: String) -> MarkerColor {
        let guesses: [(MarkerColor, String)] = [
            (.red, "pie|cake|cranberr|sauce|dessert|cookie|tart"),
            (.brown, "turkey|ham|roast|beef|pork|chicken|gravy|brisket|lamb"),
            (.green, "bean|sprout|salad|green|broccoli|asparagus|spinach|pea|kale"),
            (.orange, "stuffing|dressing|carrot|squash|sweet potato|yam"),
            (.tan, "potato|roll|bread|biscuit|corn|mac|rice|noodle"),
        ]
        for (color, pattern) in guesses
        where title.range(of: pattern, options: [.regularExpression, .caseInsensitive]) != nil {
            return color
        }
        return .ink
    }
}

nonisolated struct User: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let email: String
    let firstName: String
    let lastName: String

    var fullName: String { "\(firstName) \(lastName)" }
}

nonisolated struct FamilyMember: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let userId: Int
    let role: String
    let user: User?
}

nonisolated struct Family: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let members: [FamilyMember]
}

nonisolated struct PresetTimer: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    /// Seconds
    let duration: Int
    let stepOrder: Int?
}

nonisolated struct ItemRecipe: Codable, Hashable, Sendable {
    let id: Int
    let name: String
    let prepTime: Int?
    let cookTime: Int?
    let servings: Int?
    let timers: [PresetTimer]
}

nonisolated enum ItemKind: String, Codable, Sendable {
    case dish, event

    init(from decoder: Decoder) throws {
        let raw = try decoder.singleValueContainer().decode(String.self)
        self = ItemKind(rawValue: raw) ?? .dish
    }
}

nonisolated struct MealItem: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let mealId: Int
    let kind: ItemKind
    let title: String
    let recipeId: Int?
    let recipe: ItemRecipe?
    let startAt: Date?
    let color: MarkerColor
    let assignedToId: Int?
    let cook: User?
    let done: Bool
}

nonisolated struct Meal: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let serveAt: Date
    let notes: String?
    let items: [MealItem]
}

nonisolated enum TimerKind: String, Codable, Sendable {
    case countdown, stopwatch
}

nonisolated enum TimerStatus: String, Codable, Sendable {
    case idle, running, paused
}

nonisolated struct BoardTimer: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let kind: TimerKind
    /// Seconds set on the timer
    let duration: Double
    let color: MarkerColor
    let recipeId: Int?
    let recipeName: String?
    let status: TimerStatus
    /// Running countdown: when it reaches zero. Running stopwatch: when it started.
    let anchorAt: Date?
    /// Idle or paused: seconds left (countdown) or elapsed (stopwatch)
    let heldSeconds: Double
}

nonisolated struct ShoppingItem: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let quantity: String?
    let category: String?
    let notes: String?
    var checked: Bool
    var version: Int
    let addedBy: User?
    let checkedBy: User?
}

nonisolated struct ShoppingList: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    var items: [ShoppingItem]

    var remaining: Int { items.count(where: { !$0.checked }) }
}

nonisolated struct Ingredient: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let quantity: String?
}

nonisolated struct CookingStep: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let instruction: String
    /// Minutes
    let estimatedTime: Int?
}

nonisolated struct Recipe: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let description: String?
    let prepTime: Int?
    let cookTime: Int?
    let servings: Int?
    let assignedTo: User?
    let ingredients: [Ingredient]?
    let steps: [CookingStep]?
    let timers: [PresetTimer]?

    var totalMinutes: Int { (prepTime ?? 0) + (cookTime ?? 0) }
}

// Response envelopes

nonisolated struct SignInResponse: Codable, Sendable {
    let accessToken: String
    let refreshToken: String
    let user: User
}

nonisolated struct RefreshResponse: Codable, Sendable { let accessToken: String }

/// A sign-in request shown on the TV as a QR code and a short code
nonisolated struct DeviceLogin: Codable, Sendable, Equatable {
    /// Secret this device polls with
    let deviceCode: String
    /// Code a person reads off the screen, such as ABCD-EFGH
    let userCode: String
    let verificationUrl: String
    /// The address with the code filled in, for the QR code
    let verificationUrlComplete: String
    /// Seconds until the codes stop working
    let expiresIn: Int
    /// Seconds to wait between polls
    let interval: Int
}

nonisolated struct DeviceLoginAnswer: Codable, Sendable {
    let status: String
    let accessToken: String?
    let refreshToken: String?
    let user: User?
}
nonisolated struct UserResponse: Codable, Sendable { let user: User }
nonisolated struct FamiliesResponse: Codable, Sendable { let families: [Family] }
nonisolated struct MealsResponse: Codable, Sendable { let meals: [Meal] }
nonisolated struct MealResponse: Codable, Sendable { let meal: Meal }
nonisolated struct ShoppingListsResponse: Codable, Sendable { let shoppingLists: [ShoppingList] }
nonisolated struct ShoppingItemResponse: Codable, Sendable { let item: ShoppingItem }
nonisolated struct RecipesResponse: Codable, Sendable { let recipes: [Recipe] }
nonisolated struct RecipeResponse: Codable, Sendable { let recipe: Recipe }
nonisolated struct MessageResponse: Codable, Sendable { let message: String? }

nonisolated struct TimersResponse: Codable, Sendable {
    let timers: [BoardTimer]
    let serverTime: Date
}

nonisolated struct TimerResponse: Codable, Sendable {
    let timer: BoardTimer
    let serverTime: Date
}
