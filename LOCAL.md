# Running ASO Companion on the director's computer (Windows or Mac)

The admin (sign-in, saving, Facebook and Instagram posting) runs only on this computer. The public website on Vercel only shows the data.

## Easy install (recommended)

Make the GitHub token first (step 3 below). Then double-click one file:
- **Windows:** `setup/ASO-Setup-Windows.bat`. If Windows shows a blue box, press **More info** then **Run anyway**.
- **Mac:** `setup/ASO-Setup-Mac.command`. The first time, right-click it, choose **Open**, then **Open**.

It asks for the token once, installs Node.js and Git if they are missing, downloads and builds the app, puts the icon on the Desktop and opens the app. These two files are meant to be passed around on their own (the repository is private, so they cannot be downloaded from it without the token).

## One-time setup by hand

1. Install **Node.js** (the LTS version) from nodejs.org. On Windows also install **Git** from git-scm.com. A Mac already offers Git: the first time you use it, say yes to the "command line developer tools" window.
2. Download the app once. On Windows: open a folder, right-click > **Open in Terminal**. On a Mac: open the **Terminal** app. Then run `git clone https://github.com/justkhalid/aso-companion.git`. Open the new `aso-companion` folder.
3. Make a GitHub token so the app can save the data: github.com > your picture > **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**. Pick this repository only, set **Contents** to **Read and write**, generate, and copy it.
4. Open the app: on **Windows** double-click **ASO Companion** (the file with the `.vbs` type, shown with the Windows script icon) in the `aso-companion` folder. On a **Mac** double-click the **ASO Companion** app in that folder; the first time, right-click it > **Open** > **Open**. A small box asks for the GitHub token: paste it. The first start installs and builds for a few minutes with no window showing; the app then opens by itself in its own window.
   - A desktop icon called **ASO Companion** is made automatically. From then on, use that icon.
5. Sign in with the admin code. In Settings you can change the code.

Every day after that: double-click the **ASO Companion** icon on the desktop. There is no black window. The app keeps running quietly in the background (needed for scheduled posts, which go out only while the computer is on and awake). To close it, use Settings > Updates > **Close the app**.

If something does not start, look at the file `aso.log` in the app folder and send it to the developer. `Start-ASO.bat` (Windows) and `Start-ASO.command` (Mac) start the same app with a visible window, which helps when looking for a problem.

## Facebook and Instagram

Connect again here (Social kit > Connection), because the connection is locked with this computer's secret. To use "Connect with Facebook", add `http://localhost:3000/api/social/callback` under Valid OAuth Redirect URIs in the Meta app. Pasting a token works without that.

## Updating

Settings > **Updates** shows the installed version, what is new, and an **Update now** button. The app downloads the new version and restarts by itself (keep the black window open).

## Switching the admin off on the website

In Vercel > Settings > Environment Variables add `ASO_PUBLIC_ONLY` = `1` and redeploy. After that the website has no admin sign-in, no saving and no posting. When this is done, the GitHub token and the Facebook values can be removed from Vercel.

## If something does not start

Close the window, double-click **Start-ASO.bat** again, and if it fails take a photo of the window.

## ASO Library members

Admin > Members reads the members Google Sheet. Open it in the app on this computer, paste the Apps Script link and key once, and press Connect. They are kept encrypted in `data/members.enc.json` (never uploaded) and the list never goes through the website.
