# Running ASO Companion on the director's computer (Windows or Mac)

The admin (sign-in, saving, Facebook and Instagram posting) runs only on this computer. The public website on Vercel only shows the data.

## One-time setup

1. Install **Node.js** (the LTS version) from nodejs.org. On Windows also install **Git** from git-scm.com. A Mac already offers Git: the first time you use it, say yes to the "command line developer tools" window.
2. Download the app once. On Windows: open a folder, right-click > **Open in Terminal**. On a Mac: open the **Terminal** app. Then run `git clone https://github.com/justkhalid/aso-companion.git`. Open the new `aso-companion` folder.
3. Make a GitHub token so the app can save the data: github.com > your picture > **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**. Pick this repository only, set **Contents** to **Read and write**, generate, and copy it.
4. Double-click **Start-ASO.bat** on Windows, or **Start-ASO.command** on a Mac (the first time on a Mac: right-click it > **Open** > **Open**). On the first start it makes a settings file and opens it in Notepad (TextEdit on a Mac). After `GITHUB_PAT=` paste the token, save and close. It then installs and builds (a few minutes) and opens the admin in the browser.
5. Sign in with the admin code. In Settings you can change the code.

Every day after that: double-click **Start-ASO.bat** (Mac: **Start-ASO.command**) and keep its window open while using the app. Scheduled posts go out only while the app is running.

## Facebook and Instagram

Connect again here (Social kit > Connection), because the connection is locked with this computer's secret. To use "Connect with Facebook", add `http://localhost:3000/api/social/callback` under Valid OAuth Redirect URIs in the Meta app. Pasting a token works without that.

## Updating

Settings > **Updates** shows the installed version, what is new, and an **Update now** button. The app downloads the new version and restarts by itself (keep the black window open).

## Switching the admin off on the website

In Vercel > Settings > Environment Variables add `ASO_PUBLIC_ONLY` = `1` and redeploy. After that the website has no admin sign-in, no saving and no posting. When this is done, the GitHub token and the Facebook values can be removed from Vercel.

## If something does not start

Close the window, double-click **Start-ASO.bat** again, and if it fails take a photo of the window.
