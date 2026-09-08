# Pretendard

All game text uses the locally bundled Pretendard 1.3.9 variable webfont.
The font includes Korean and supports weights 45–920. No installed system font
or external font service is required.

- Official release: https://github.com/orioncactus/pretendard/releases/tag/v1.3.9
- Original file: `web/variable/woff2/PretendardVariable.woff2`
- License: SIL Open Font License 1.1, included in `OFL.txt`
- Load `pretendard.css` and use `font-family: var(--font-game)` for UI text.

This directory is copied into `dist/client/fonts` during the build. The shared
stylesheet applies the same font to all three games, including titles, controls,
coordinates and move history.
