Quickly change element type from string to JSX Object in MusicData:

1. Press Ctrl+H (or Cmd+H on Mac) to open the Find and Replace panel.
2. Click on the .* icon (or press Alt+R) to enable regular expressions in the search.
3. In the "Find" field, enter: "path":\s*"([^"]+)"
4. In the "Replace" field, enter: "path": <$1/>
5. Click "Replace All" (or press Ctrl+Alt+Enter on Windows/Linux or Cmd+Option+Enter on Mac) to replace all instances in the file.