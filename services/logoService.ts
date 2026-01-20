import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

interface PickImageResult {
  success: boolean;
  uri?: string;
  base64?: string;
  error?: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function pickImageFromGallery(): Promise<PickImageResult> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      return {
        success: false,
        error: 'نحتاج إلى إذن الوصول إلى المعرض',
      };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      return { success: false, error: 'تم إلغاء اختيار الصورة' };
    }

    return {
      success: true,
      uri: result.assets[0].uri,
      base64: result.assets[0].base64,
    };
  } catch (error) {
    console.error('Error picking image from gallery:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء اختيار الصورة',
    };
  }
}

export async function pickImageFromCamera(): Promise<PickImageResult> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      return {
        success: false,
        error: 'نحتاج إلى إذن الوصول إلى الكاميرا',
      };
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) {
      return { success: false, error: 'تم إلغاء التقاط الصورة' };
    }

    return {
      success: true,
      uri: result.assets[0].uri,
      base64: result.assets[0].base64,
    };
  } catch (error) {
    console.error('Error picking image from camera:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء التقاط الصورة',
    };
  }
}

export async function uploadLogo(
  base64: string,
  fileName?: string,
): Promise<UploadResult> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    const fileExt = fileName?.split('.').pop() || 'png';
    const validExtensions = ['jpg', 'jpeg', 'png'];

    if (!validExtensions.includes(fileExt.toLowerCase())) {
      return { success: false, error: 'نوع الملف غير مدعوم. استخدم JPG أو PNG' };
    }

    const filePath = `${userData.user.id}/${Date.now()}.${fileExt}`;

    const arrayBuffer = decode(base64);

    const { data, error } = await supabase.storage
      .from('shop-logos')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading logo:', error);
      return { success: false, error: 'فشل رفع الصورة' };
    }

    const { data: urlData } = supabase.storage
      .from('shop-logos')
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    console.error('Error in uploadLogo:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء رفع الصورة',
    };
  }
}

export async function deleteLogo(logoUrl: string): Promise<boolean> {
  try {
    const path = logoUrl.split('/shop-logos/').pop();
    if (!path) return false;

    const { error } = await supabase.storage
      .from('shop-logos')
      .remove([path]);

    if (error) {
      console.error('Error deleting logo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteLogo:', error);
    return false;
  }
}

export async function updateShopLogo(logoUrl: string): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return false;
    }

    const { data: existingSettings } = await supabase
      .from('app_settings')
      .select('id, shop_logo_url')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (existingSettings) {
      if (existingSettings.shop_logo_url) {
        await deleteLogo(existingSettings.shop_logo_url);
      }

      const { error } = await supabase
        .from('app_settings')
        .update({
          shop_logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSettings.id);

      return !error;
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          user_id: userData.user.id,
          shop_logo_url: logoUrl,
        });

      return !error;
    }
  } catch (error) {
    console.error('Error updating shop logo:', error);
    return false;
  }
}

export async function updateShopSettings(settings: {
  shopName?: string;
  shopPhone?: string;
  shopAddress?: string;
}): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return false;
    }

    const { data: existingSettings } = await supabase
      .from('app_settings')
      .select('id')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (settings.shopName !== undefined) {
      updateData.shop_name = settings.shopName;
    }
    if (settings.shopPhone !== undefined) {
      updateData.shop_phone = settings.shopPhone;
    }
    if (settings.shopAddress !== undefined) {
      updateData.shop_address = settings.shopAddress;
    }

    if (existingSettings) {
      const { error } = await supabase
        .from('app_settings')
        .update(updateData)
        .eq('id', existingSettings.id);

      return !error;
    } else {
      const { error } = await supabase
        .from('app_settings')
        .insert({
          user_id: userData.user.id,
          ...updateData,
        });

      return !error;
    }
  } catch (error) {
    console.error('Error updating shop settings:', error);
    return false;
  }
}

export async function getShopSettings() {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return null;
    }

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (error) {
      console.error('Error getting shop settings:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getShopSettings:', error);
    return null;
  }
}
