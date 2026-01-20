import { supabase } from '@/lib/supabase';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const FALLBACK_LOGO_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='50' fill='%23059669'/%3E%3Crect x='35' y='45' width='50' height='35' fill='white' rx='3'/%3E%3Crect x='40' y='35' width='40' height='45' fill='white' rx='3'/%3E%3Crect x='50' y='50' width='8' height='12' fill='%23059669'/%3E%3Crect x='62' y='50' width='8' height='12' fill='%23059669'/%3E%3Crect x='53' y='65' width='14' height='15' fill='%23059669' rx='1'/%3E%3C/svg%3E`;

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
