import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'apple';

// Use Expo Linking to create proper deep link redirect
const redirectUri = Linking.createURL('auth/callback');

console.log('OAuth Redirect URI:', redirectUri);

export async function signInWithProvider(provider: Provider) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectUri,
      {
        showInRecents: true,
        preferEphemeralSession: Platform.OS === 'ios',
      }
    );

    if (result.type === 'success') {
      const url = result.url;
      const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) throw sessionError;
        return { data: sessionData, error: null };
      }
    }

    return { data: null, error: new Error('Authentication was cancelled') };
  } catch (error) {
    console.error('Social auth error:', error);
    return { data: null, error: error as Error };
  }
}

export async function signInWithGoogle() {
  return signInWithProvider('google');
}

export async function signInWithApple() {
  return signInWithProvider('apple');
}
