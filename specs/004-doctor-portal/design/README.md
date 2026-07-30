# Doctor Portal — Stitch design pack

Export approved Stitch screens here before pixel UI implementation.

## Expected layout

```text
design/
├── README.md              # this file
├── manifest.json          # screenId → route + desktop/mobile filenames
├── d-*.png                # desktop frames
├── m-*.png                # mobile frames
└── (optional) html/       # Stitch HTML export if available
```

## Manifest shape

```json
{
  "projectId": "<stitch-project-id>",
  "screens": [
    {
      "id": "<screen-id>",
      "name": "Doctor Dashboard",
      "route": "/doctor",
      "desktop": "d-dashboard.png",
      "mobile": "m-dashboard.png"
    }
  ]
}
```

## Required screen coverage

Dashboard · Schedule · Upcoming Appointments · Patient Queue · Patient Details · Consultation Workspace · SOAP Notes · Clinical Summary · AI Medical Assistant · AI Documentation · AI Prescription · Create Prescription · Review & Sign · Medical Records · Lab Results · Video Consultation · Notifications · Profile · Settings

## Status

**Exported 2026-07-30** from Stitch project `2408493713147971043`. See `manifest.json` for screen → route → file mapping.

- 16/17 screens have desktop PNG + HTML
- `workspace-module-org`: HTML only (Stitch returned no screenshot URL)
