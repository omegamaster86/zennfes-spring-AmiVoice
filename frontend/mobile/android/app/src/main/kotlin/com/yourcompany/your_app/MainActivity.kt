package com.yourcompany.your_app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    private val TAG = "DeepLinkDebug"

    override fun onCreate(savedInstanceState: Bundle?) {
        Log.d(TAG, "[NATIVE] onCreate - intent: ${intent?.data}")
        super.onCreate(savedInstanceState)
        Log.d(TAG, "[NATIVE] onCreate done")
    }

    override fun onNewIntent(intent: Intent) {
        Log.d(TAG, "[NATIVE] onNewIntent - data: ${intent.data}")
        super.onNewIntent(intent)
    }

    override fun onResume() {
        Log.d(TAG, "[NATIVE] onResume")
        super.onResume()
    }

    override fun onPause() {
        Log.d(TAG, "[NATIVE] onPause")
        super.onPause()
    }

    override fun onDestroy() {
        Log.d(TAG, "[NATIVE] onDestroy")
        super.onDestroy()
    }
}
