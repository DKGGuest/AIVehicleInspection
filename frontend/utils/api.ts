// API service - Connected to FastAPI Backend
import * as FileSystem from 'expo-file-system/legacy';

// Backend API Configuration
const API_BASE_URL = 'http://192.168.29.142:8000'; // Ensure this matches your backend IP

export async function demoLogin() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/demo-login`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Demo login failed');
    return await response.json();
  } catch (error) {
    console.error('Demo login error:', error);
    throw error;
  }
}

export async function requestOTP(phone: string) {
  try {
    const formData = new FormData();
    formData.append('phone', phone);

    const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Request OTP failed');
    return await response.json();
  } catch (error) {
    console.error('Request OTP error:', error);
    throw error;
  }
}

export async function verifyOTP(phone: string, otp: number) {
  try {
    const formData = new FormData();
    formData.append('phone', phone);
    formData.append('otp', otp.toString());

    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Verify OTP failed');
    return await response.json();
  } catch (error) {
    console.error('Verify OTP error:', error);
    throw error;
  }
}

export async function startInspection(userId: number | string) {
  try {
    const formData = new FormData();
    formData.append('user_id', userId.toString());

    const response = await fetch(`${API_BASE_URL}/inspection/start`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('Start inspection failed');
    return await response.json();
  } catch (error) {
    console.error('Start inspection error:', error);
    throw error;
  }
}

export async function uploadImage(
  inspectionId: number,
  imageType: string,
  imageUri: string
) {
  try {
    const formData = new FormData();
    formData.append('inspection_id', inspectionId.toString());
    formData.append('image_type', imageType);

    // Append file
    const uriParts = imageUri.split('.');
    const fileType = uriParts[uriParts.length - 1];

    formData.append('file', {
      uri: imageUri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`,
    } as any);

    const response = await fetch(`${API_BASE_URL}/inspection/upload-image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) throw new Error('Upload image failed');
    return await response.json();
  } catch (error) {
    console.error('Upload image error:', error);
    throw error;
  }
}

export async function submitPhotos(userId: string, carModel: string, photoIds: string[], analysisResults: any[]) {
  try {
    const response = await fetch(`${API_BASE_URL}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        carModel,
        photoIds,
        analysisResults,
      }),
    });

    if (!response.ok) {
      throw new Error(`Submission failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Submission error:', error);
    throw error;
  }
}

export async function deletePhoto(photoId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/photos/${photoId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
}

export async function imageToBase64(imageUri: string): Promise<string> {
  try {
    const base64 = await (FileSystem as any).readAsStringAsync(imageUri, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Base64 conversion error:', error);
    throw error;
  }
}
export async function compareImages(oldImageUri: string, newImageUri: string) {
  try {
    const formData = new FormData();

    const getFileObj = (uri: string, name: string) => {
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      return {
        uri,
        name: `${name}.${fileType}`,
        type: `image/${fileType}`,
      } as any;
    };

    formData.append('old_image', getFileObj(oldImageUri, 'old'));
    formData.append('new_image', getFileObj(newImageUri, 'new'));

    const response = await fetch(`${API_BASE_URL}/compare-images`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) throw new Error('Image comparison failed');
    return await response.json();
  } catch (error) {
    console.error('Image comparison error:', error);
    throw error;
  }
}

export async function uploadFile(fileType: string, fileUri: string) {
  try {
    const formData = new FormData();
    const uriParts = fileUri.split('.');
    const ext = uriParts[uriParts.length - 1];

    // Basic MIME type inference
    let type = 'application/octet-stream';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext.toLowerCase())) type = `image/${ext}`;
    else if (ext.toLowerCase() === 'pdf') type = 'application/pdf';

    formData.append('file', {
      uri: fileUri,
      name: `file.${ext}`,
      type: type,
    } as any);

    const response = await fetch(`${API_BASE_URL}/upload/${fileType}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) throw new Error('Upload generic file failed');
    return await response.json();
  } catch (error) {
    console.error('Upload generic file error:', error);
    throw error;
  }
}
