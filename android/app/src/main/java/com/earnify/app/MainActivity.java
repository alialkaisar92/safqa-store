package com.earnify.app;
import android.app.Activity;import android.os.Bundle;import android.view.View;import android.webkit.WebSettings;import android.webkit.WebView;import android.webkit.WebViewClient;
public class MainActivity extends Activity{
 private WebView wv;
 @Override protected void onCreate(Bundle s){super.onCreate(s);
  wv=new WebView(this);
  WebSettings st=wv.getSettings();
  st.setJavaScriptEnabled(true);st.setDomStorageEnabled(true);st.setDatabaseEnabled(true);
  st.setCacheMode(WebSettings.LOAD_DEFAULT);st.setMediaPlaybackRequiresUserGesture(false);
  wv.setWebViewClient(new WebViewClient());
  wv.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
  setContentView(wv);
  wv.loadUrl(BuildConfig.APP_URL);
 }
 @Override public void onBackPressed(){if(wv.canGoBack())wv.goBack();else super.onBackPressed();}
}
