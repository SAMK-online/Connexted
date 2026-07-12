# CONNEXTed Browser Extension

Chrome/Edge MV3 extension for sending a public social post URL and selected text into a CONNEXTed event folder.

## Local Install

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select this `browser-extension` directory.

## Usage

- Open a public LinkedIn, X, or Instagram post.
- Highlight visible post text when useful.
- Click the CONNEXTed extension icon, choose the event folder, and send the post.
- Or right-click the page, link, or selection and choose `Send to CONNEXTed`.

The extension sends only user-provided page URL, selected/entered text, hashtags, keywords, organization ID, and rep ID to `/api/social/discover`.

## Settings

Defaults are local development values:

- API URL: `http://localhost:8000`
- App URL: `http://localhost:5173`
- Organization: `demo-org`
- Rep: `demo-rep`

For deployed APIs, Chrome will prompt for host permission the first time a new API origin is used.
