# Study Tracker (React Native, Android)

Offline app to track everything you learn (Math, ML, DL, NLP, CV, DSA, MTech thesis, AI for Health)
as **Section → Topic → Sub-topic**, with automatic **weekly revision** scheduling,
a daily journal, a weekly report, and **JSON export / import** backup.

## Run on your USB-connected phone

Requirements: Node >= 22.11, JDK 17-21, Android Studio with SDK Platform 36/37 + Build-Tools 37 installed
(Gradle can auto-download them if licences are accepted: `sdkmanager --licenses`).

1. Phone: enable Developer options -> USB debugging, connect by USB, accept the prompt.
2. Check the phone is listed: `adb devices`
3. In this folder:

```
npm install
npx react-native start        # terminal 1 (leave running)
npx react-native run-android  # terminal 2  (first build takes several minutes)
```

If Metro cannot reach the phone: `adb reverse tcp:8081 tcp:8081`

### Standalone release APK (runs without the laptop)
```
cd android && ./gradlew assembleRelease
```
APK: `android/app/build/outputs/apk/release/app-release.apk` (signed with the debug key, fine for personal use).
Install: `adb install -r app-release.apk`

## Backup / restore
Backup tab -> Export (Downloads / Save as… / Share as text). Import from a JSON file or pasted text,
with preview and Replace / Merge modes. A safety copy is kept before every import, so you can undo.
`sample-import.json` shows the file format (you can also write your syllabus by hand using nested `children`).

Data lives in the app's private storage. Uninstalling the app deletes it, so export regularly.
