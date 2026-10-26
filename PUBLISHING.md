# Publishing RENO as a phone app

RENO is a progressive web app (PWA). That means it already works as an app without any store:

- **Android:** open the site in Chrome. RENO offers an **Install app** button, or you can use the menu (⋮) and choose **Install app**.
- **iPhone:** open the site in Safari, tap **Share**, then **Add to Home Screen**.

Once installed, RENO opens full screen from the home screen with its own icon, and pages you've visited still open without internet.

For the Congressional App Challenge, this is enough: judges need a demo video and your code, not a store listing. The store steps below are optional.

> Both stores require the developer account holder to be **18 or older**. If you're under 18, a parent or guardian needs to create the account.

---

## Before either store

1. Deploy the site on Vercel so it has a public `https://` address.
2. Go to **https://www.pwabuilder.com**, paste your site address and click **Start**. It checks the manifest, icons and service worker. RENO should pass all three.

---

## Google Play Store (Android)

**Cost:** $25 one-time for a Google Play developer account.

1. On PWABuilder, click **Package for stores → Android → Generate package**.
   - **Package ID:** something unique, like `app.renosavelife.twa`
   - **App name:** RENO Save Life
   - Keep the other defaults.
2. Download the zip. It contains:
   - an `.aab` file, which is what you upload to Google Play
   - an `.apk` file, which you can install on your own Android phone to test
   - a **signing key** and its passwords. **Back these up somewhere safe.** You need them for every future update, and Google can't recover them.
   - an `assetlinks.json` file
3. Copy `assetlinks.json` into this project at `public/.well-known/assetlinks.json`, commit, and push. This proves you own the site, so the Android app opens without a browser address bar.
4. Create a Google Play developer account at **https://play.google.com/console**.
5. Create an app, then fill in the store listing: description, screenshots (at least 2 phone screenshots) and the 512×512 icon (`public/img/icon-512.png`).
6. Complete the app content forms:
   - **Privacy policy URL:** Google requires one for health apps. You can link to a page on your site explaining that data stays on the device.
   - **Health apps declaration:** say it provides general health information and isn't a medical device.
   - **Data safety:** RENO doesn't collect or share personal data, since everything is stored on the device.
7. Upload the `.aab` to a **closed testing** track. New personal developer accounts must run a closed test with at least 12 testers for 14 days before they can publish to everyone.
8. After testing, promote the release to **Production** and submit it for review.

---

## Apple App Store (iPhone)

**Cost:** $99 per year for the Apple Developer Program. **You also need a Mac** with Xcode installed.

1. Join the Apple Developer Program at **https://developer.apple.com/programs**.
2. On PWABuilder, click **Package for stores → iOS → Generate package** and download the zip.
3. On a Mac, open the project in Xcode (open the `.xcworkspace` file in the zip).
4. In Xcode, select your team under **Signing & Capabilities** and set a unique bundle ID, like `app.renosavelife`.
5. Test it on an iPhone simulator, then choose **Product → Archive** and upload to **App Store Connect**.
6. In App Store Connect, add screenshots, a description, a privacy policy URL and the privacy questions ("Data not collected").
7. Submit for review.

**A caution:** Apple sometimes rejects apps that are mostly a website in an app wrapper. RENO has interactive tools and works offline, which helps, but be ready for review feedback. Since iPhone users can already install RENO through Add to Home Screen, the App Store is the most optional step here.

---

## Updating the app later

- **Website and installed apps:** push to GitHub. Vercel redeploys, and installed apps pick up the changes the next time they're opened online.
- **If you change cached files a lot:** bump `VERSION` at the top of `public/sw.js` (for example `reno-v2`) so phones fetch fresh copies.
- **Store versions:** they load the live website, so most updates don't need a new store submission.
