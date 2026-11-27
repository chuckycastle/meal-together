# MealTogether for Apple TV

A tvOS app that shows the kitchen board on an Apple TV and controls it with the Siri Remote. It uses the production API at `mealtogether.chuckycastle.io`; it has no server code of its own.

## Screens

- **Dashboard**: meal name and serve time, time left until the meal, the clock, the schedule sheet, and up to six running timers. The screen stays awake. After 25 seconds without remote input the focus highlight and the action bar dim.
- **Timers**: click a timer to pause, resume, start, or clear it. Hold for add 1 minute, add 5 minutes, reset, and remove. The remote's play/pause button does the same as a click. A chime plays when a countdown ends.
- **New timer**: pick a length from 1 minute to 4 hours, start a stopwatch, or start a timer already on the board. A name is optional.
- **Dish**: click a dish to mark it done, choose its cook, start its recipe's timers, or open the recipe.
- **Shopping**: items by category. Click an item to check it off for the family.
- **Recipes**: ingredients, steps, and preset timers. Clicking a step marks it done for the whole family; steps marked on other devices show here within 5 seconds. **Start the steps over** opens them all again. Ingredient ticks stay on the TV.
- **Settings**: family, the meal shown on the dashboard, dark or light colors, timer sound, and sign-out.

## Requirements

- Xcode 26 or later with the tvOS SDK
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- tvOS 26 or later on the Apple TV

## Build

```bash
cd tv
cp Signing.example.xcconfig Signing.xcconfig   # set DEVELOPMENT_TEAM
xcodegen generate
open MealTogetherTV.xcodeproj
```

`MealTogetherTV.xcodeproj` and `Signing.xcconfig` are generated or local and are not committed.

## Install on an Apple TV

Pair the Apple TV once. On the TV open Settings > Remotes and Devices > Remote App and Devices, then run:

```bash
xcrun devicectl manage pair --device "<Apple TV name>"
```

Build, install, and launch:

```bash
xcodebuild -project MealTogetherTV.xcodeproj -scheme MealTogetherTV -configuration Release \
  -destination "platform=tvOS,name=<Apple TV name>" -derivedDataPath DerivedData \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
xcrun devicectl device install app --device "<Apple TV name>" \
  DerivedData/Build/Products/Release-appletvos/MealTogether.app
xcrun devicectl device process launch --device "<Apple TV name>" io.chuckycastle.mealtogether
```

A development-signed install runs until its provisioning profile expires, one year for a paid developer account. Reinstall to renew it.

## Test

```bash
xcodebuild -project MealTogetherTV.xcodeproj -scheme MealTogetherTV \
  -destination "platform=tvOS Simulator,name=Apple TV 4K (3rd generation)" test
```

### Simulator against a local API

Start the Worker with `wrangler dev`, then launch a Debug simulator build with these environment variables. They are read only by Debug simulator builds.

| Variable | Use |
| --- | --- |
| `MT_API_BASE` | API address, such as `http://localhost:8787` |
| `MT_EMAIL`, `MT_PASSWORD` | Sign in without the on-screen keyboard |
| `MT_SCREEN` | Open a screen at launch: `shopping`, `recipes`, `recipe:<id>`, `settings`, `newtimer`, `dish` |

Pass them through `simctl` with a `SIMCTL_CHILD_` prefix.

### Remote-driven test

`MealTogetherTVUITests` presses Siri Remote buttons to mark a recipe step done and checks that the mark holds after a refresh. It is skipped unless a local server and a test account are given:

```bash
TEST_RUNNER_MT_API_BASE=http://localhost:8787 TEST_RUNNER_MT_EMAIL=<email> TEST_RUNNER_MT_PASSWORD=<password> \
TEST_RUNNER_MT_RECIPE=<recipe id> xcodebuild -project MealTogetherTV.xcodeproj -scheme MealTogetherTV \
  -destination "platform=tvOS Simulator,name=Apple TV 4K (3rd generation)" test -only-testing:MealTogetherTVUITests
```

## Layout

```
tv/
├── project.yml                 # XcodeGen project definition
├── Scripts/make_icons.swift    # Draws the app icon layers and Top Shelf images
├── MealTogetherTV/
│   ├── App/                    # App entry, root state, navigation
│   ├── Core/                   # API client, models, session, live kitchen state, timer math, chime
│   ├── Design/                 # Palette, fonts, focus styles, shared views
│   ├── Features/               # One folder per screen
│   └── Resources/Fonts/        # Shantell Sans and Atkinson Hyperlegible Next (SIL OFL 1.1)
├── MealTogetherTVTests/        # Timer math, schedule grouping, time labels, decoding
└── MealTogetherTVUITests/      # Remote-driven test against a local server
```

## Sign-in

The sign-in screen shows a QR code and an 8-character code.

1. Scan the QR code with a phone, or open `mealtogether.chuckycastle.io/link` and type the code.
2. Sign in on the phone if asked. The page returns to the code afterward.
3. Check that the code matches the TV and choose **Sign in the TV**. The TV shows the kitchen within a few seconds.

A code lasts 10 minutes and works once; the TV draws a new one when it expires. **This is not my TV** on the phone refuses the code. **Use a password instead** on the TV opens an email and password form.

The access and refresh tokens are stored in the tvOS keychain. The refresh token lasts 30 days, after which the app asks to sign in again.

### API

| Request | Caller | Result |
| --- | --- | --- |
| `POST /api/auth/device` | TV | `device_code` (secret), `user_code`, `verification_url`, `verification_url_complete`, `expires_in`, `interval` |
| `POST /api/auth/device/approve` with `user_code` | Signed-in phone | Marks the code approved for that person |
| `POST /api/auth/device/deny` with `user_code` | Signed-in phone | Refuses the code |
| `POST /api/auth/device/token` with `device_code` | TV, every `interval` seconds | `{"status":"pending"}`, or tokens and the user once approved; 403 when refused, 410 when expired or already used |

The server stores a SHA-256 hash of the device code, not the code. Starting, approving, and refusing are rate limited to 10 requests per minute per address.
