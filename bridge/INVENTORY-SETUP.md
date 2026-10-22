# Connect the inventory to the Google Sheet

About 10 minutes, once. The Sheet owner does it, with the Google account that owns or can edit the Sheet.
It adds one tab, **Inventory**, and one private Drive folder, **ASO Inventory photos**. No other tab is read or changed.

1. Open the Sheet. **Extensions > Apps Script**. Rename the project **ASO Companion inventory**.
   (If the Sheet already has a script, do not paste into it. Make a separate project at script.google.com and, in `book_()`, replace `SpreadsheetApp.getActive()` with `SpreadsheetApp.openById('THE-SHEET-ID')`. The ID is the long part of the Sheet's address between `/d/` and `/edit`.)
2. Delete everything in `Code.gs`. Open `bridge/Inventory.gs`, copy all of it, paste it, and save.
3. In the function menu next to **Run**, choose **setup** and press **Run**. Allow the permissions (Review permissions > your account > Advanced > Go to ... > Allow). The log at the bottom prints `Setup done. Your app key is: ...`. Copy that key.
4. **Deploy > New deployment > Web app**. Execute as: **Me**. Who has access: **Anyone**. The key protects it. Press Deploy and copy the **Web app URL** (ends with `/exec`).
5. In ASO Companion: **Inventory > Sheet**, paste the address and the key, press **Test and connect**. Items that were kept on the computer before are added to the Sheet.

After changing the script later: **Deploy > Manage deployments > Edit > New version > Deploy**. The address stays the same.
