# ProPresenter theme reverse-engineering notes

Source: attached `BibelTest.protheme` (ProPresenter 7 theme pack = ZIP64 containing `Theme/Theme` protobuf).

## Extracted “BibelTest” look (document 1920×1080)

| Box | Font | Size | Align | Position (x, y, w, h) | Tracking |
| --- | --- | --- | --- | --- | --- |
| Verse | Georgia | 90 pt (`\fs180`) | left (`\ql`) | 142 × 147 × 1654 × 690 | `\expnd12\expndtw60` |
| Reference | Georgia | 46 pt (`\fs92`) | left | 158 × 808 × 1122 × 168 | `\expnd20\expndtw100` |

Background: solid black. Sample RTF in the theme uses Cocoa RTF with `\froman` Georgia and white `\cf2`.

Our `.pro6` exporter now writes the same visual parameters into ProPresenter 6 XML (`RVTextElement` + Base64 RTF), driven by the in-app **Standard Bibel** / **Standard Rubrik** themes.
