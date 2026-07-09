# StayFit

Persönliche Workout-Tracking-App (Expo SDK 56).

## App herunterladen

### Android

1. Öffne die [EAS Builds Übersicht](https://expo.dev/accounts/ezatu/projects/stayfit/builds) im Browser (auf dem Handy oder am PC).
2. Klicke auf den neuesten Build mit **Profile: preview** und **Status: finished**.
3. Öffne den Link unter **Application Archive URL** (endet auf `.apk`) — das lädt die APK direkt aufs Handy.
4. Falls Android beim Installieren blockiert: **Einstellungen → Apps → Spezieller Zugriff → Unbekannte Apps installieren** für den Browser/Dateimanager erlauben, aus dem heraus du installierst.
5. APK antippen → **Installieren**.

Alternativ per Terminal einen neuen Build starten und den Link direkt bekommen:
```
eas build --platform android --profile preview
```
Am Ende der Ausgabe steht ein Link zur Build-Seite mit Download-Button.

### iOS

Für iOS ist bisher **kein Build vorhanden** — dafür wird ein kostenpflichtiger Apple Developer Account (99 $/Jahr) benötigt, weil Apple Sideloading ohne Account nicht erlaubt.

Sobald ein Account vorhanden ist:
```
eas build --platform ios --profile preview
```
Das Gerät muss vorher als Testgerät registriert sein (`eas device:create`), danach kommt die Installation entweder über TestFlight oder einen Ad-hoc-Installationslink.

## App aktualisieren (ohne neue Installation)

Für reine Code-/UI-Änderungen (kein neues Icon, keine neuen nativen Pakete, keine neuen Permissions) reicht ein OTA-Update — keine neue APK/kein neuer Download nötig:

```
eas update --branch preview --environment preview --message "Beschreibung der Änderung"
```

Danach auf dem Handy: App komplett schließen (aus Recents wischen) und neu öffnen — bei Bedarf zweimal, damit das Update geladen und aktiviert wird.

Eine **neue Installation** ist nur nötig bei nativen Änderungen: neues App-Icon, neue Permissions, neue native Pakete (z. B. `expo-haptics`, `expo-av`).

## Entwicklung

```
npm install
npx expo start
```

Branch/Channel für Testbuilds: `preview`. Produktion (Play Store / App Store): `production`.
