import { supabase } from '@/lib/supabase';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const FALLBACK_LOGO_SVG = `data:image/svg+xml;base64,${btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <rect width="120" height="120" fill="#059669"/>
    <text x="60" y="70" font-size="48" fill="white" text-anchor="middle" font-family="Arial">🏪</text>
  </svg>
`)}`;

async function getDefaultLogoBase64(): Promise<string> {
  try {
    const [asset] = await Asset.loadAsync(require('@/assets/images/icon.png'));

    if (Platform.OS === 'web') {
      return asset.uri;
    }

    const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error loading default logo:', error);
    return FALLBACK_LOGO_SVG;
  }
}

async function getLogoFromDatabase(): Promise<string | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return null;
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('shop_logo_url')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error || !data?.shop_logo_url) {
      return null;
    }

    return data.shop_logo_url;
  } catch (error) {
    console.error('Error getting logo from database:', error);
    return null;
  }
}

async function convertUrlToBase64(url: string): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      return url;
    }

    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    return url;
  }
}

export async function getLogoBase64(): Promise<string> {
  try {
    const logoUrl = await getLogoFromDatabase();

    if (logoUrl) {
      return await convertUrlToBase64(logoUrl);
    }

    return await getDefaultLogoBase64();
  } catch (error) {
    console.error('Error in getLogoBase64:', error);
    return FALLBACK_LOGO_SVG;
  }
}

export async function getLogoUrl(): Promise<string | null> {
  try {
    return await getLogoFromDatabase();
  } catch (error) {
    console.error('Error in getLogoUrl:', error);
    return null;
  }
}

export async function getReceiptLogoBase64(): Promise<string> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return await getDefaultLogoBase64();
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('receipt_logo_url, shop_logo_url')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) {
      return await getDefaultLogoBase64();
    }

    const logoUrl = data?.receipt_logo_url || data?.shop_logo_url;

    if (logoUrl) {
      return await convertUrlToBase64(logoUrl);
    }

    return await getDefaultLogoBase64();
  } catch (error) {
    console.error('Error in getReceiptLogoBase64:', error);
    return await getDefaultLogoBase64();
  }
}
