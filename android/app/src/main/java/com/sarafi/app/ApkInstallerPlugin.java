package com.sarafi.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.security.MessageDigest;

/**
 * Off-Play in-app APK updater.
 *
 * The JS layer downloads the new signed APK into the app cache directory
 * (via @capacitor/filesystem) and calls install() with the file name plus the
 * expected SHA-256. We verify the digest, then hand the file to the system
 * package installer through a FileProvider URI. Because the new APK is signed
 * with the same key as the installed one and has a higher versionCode, Android
 * upgrades in place and keeps all app data.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void install(PluginCall call) {
        String fileName = call.getString("fileName");
        String expectedSha = call.getString("sha256");

        if (fileName == null || fileName.trim().isEmpty()) {
            call.reject("fileName is required");
            return;
        }

        File apk = new File(getContext().getCacheDir(), fileName);
        if (!apk.exists()) {
            call.reject("APK not found in cache: " + fileName);
            return;
        }

        try {
            if (expectedSha != null && !expectedSha.isEmpty()) {
                String actual = sha256(apk);
                if (!actual.equalsIgnoreCase(expectedSha)) {
                    if (!apk.delete()) {
                        // Best effort cleanup; the digest already failed.
                    }
                    call.reject("APK checksum mismatch (expected " + expectedSha + ", got " + actual + ")");
                    return;
                }
            }
        } catch (Exception e) {
            call.reject("Could not verify APK: " + e.getMessage());
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageManager pm = getContext().getPackageManager();
            if (!pm.canRequestPackageInstalls()) {
                try {
                    Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settings.setData(Uri.parse("package:" + getContext().getPackageName()));
                    settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(settings);
                } catch (Exception ignored) {
                }
                JSObject ret = new JSObject();
                ret.put("needsPermission", true);
                ret.put("message", "Allow installs from this source, then try again.");
                call.resolve(ret);
                return;
            }
        }

        try {
            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("launched", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Could not start installer: " + e.getMessage());
        }
    }

    private String sha256(File file) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (FileInputStream in = new FileInputStream(file)) {
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) {
                md.update(buf, 0, n);
            }
        }
        byte[] digest = md.digest();
        StringBuilder sb = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
