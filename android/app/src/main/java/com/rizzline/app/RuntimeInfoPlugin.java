package com.rizzline.app;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import java.io.File;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "RuntimeInfo")
public class RuntimeInfoPlugin extends Plugin {
    private static final Set<String> GDPR_REGIONS = new HashSet<>(Arrays.asList(
        "AT", "BE", "BG", "CH", "HR", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR",
        "GB", "GR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MT", "NL", "NO",
        "PL", "PT", "RO", "SE", "SI", "SK"
    ));

    @PluginMethod
    public void getInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("requiresGdprConsent", requiresGdprConsent());
        call.resolve(result);
    }

    private boolean requiresGdprConsent() {
        String country = Locale.getDefault().getCountry().toUpperCase(Locale.US);
        return GDPR_REGIONS.contains(country);
    }

    private File cacheFile(PluginCall call) throws Exception {
        String path = Uri.parse(call.getString("uri", "")).getPath();
        if (path == null) throw new IllegalArgumentException("Missing image file");
        File file = new File(path).getCanonicalFile();
        String cacheRoot = getContext().getCacheDir().getCanonicalPath() + File.separator;
        if (!file.getPath().startsWith(cacheRoot) || !file.isFile()) {
            throw new IllegalArgumentException("Image must be inside the app cache");
        }
        return file;
    }

    private void copyImage(File source, Uri target) throws Exception {
        try (FileInputStream input = new FileInputStream(source);
             OutputStream output = getContext().getContentResolver().openOutputStream(target)) {
            if (output == null) throw new IllegalStateException("Cannot write image");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
        }
    }

    @PluginMethod
    public void saveImage(PluginCall call) {
        try {
            File source = cacheFile(call);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, source.getName());
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/RizzLine");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                Uri target = getContext().getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                if (target == null) throw new IllegalStateException("Cannot create image");
                try {
                    copyImage(source, target);
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    getContext().getContentResolver().update(target, values, null, null);
                } catch (Exception error) {
                    getContext().getContentResolver().delete(target, null, null);
                    throw error;
                }
                JSObject result = new JSObject();
                result.put("saved", true);
                call.resolve(result);
            } else {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/png");
                intent.putExtra(Intent.EXTRA_TITLE, source.getName());
                startActivityForResult(call, intent, "imageSaveResult");
            }
        } catch (Exception error) { call.reject("Could not save story image", error); }
    }

    @ActivityCallback
    private void imageSaveResult(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        Intent data = activityResult.getData();
        JSObject result = new JSObject();
        if (activityResult.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            result.put("saved", false);
            call.resolve(result);
            return;
        }
        getBridge().execute(() -> {
            try {
                copyImage(cacheFile(call), data.getData());
                result.put("saved", true);
                call.resolve(result);
            } catch (Exception error) { call.reject("Could not save story image", error); }
        });
    }
}
