// uploadApi.ts
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";


/**
 * 이미지(jpg, png 등) 선택 후 서버 업로드
 * @param baseUrl 서버 기본 URL (예: http://4.240.103.29:8080)
 * @param id path parameter
 */

export const uploadImage = async (baseUrl: string, id: string) => {  try {
    //1. 이미지 권한 요청
    const imgPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!imgPerm.granted) throw new Error("이미지 접근 권한 필요");

    // 2. 이미지 선택
    const imageResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (imageResult.canceled) throw new Error("이미지 선택 취소");

    console.log(imageResult)
    const imageUri = imageResult.assets[0].uri;
    const extension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";

    const req = await fetch(imageUri);        
    const blob = await req.blob();            
    const formData = new FormData();
    formData.append("file", blob, imageResult.assets[0].fileName);

    // const result = await DocumentPicker.getDocumentAsync({
    //   type: '*/*', // 모든 파일
    // });

    // if (result.type === 'cancel') return;

    // const formData = new FormData();
    // formData.append('file', {
    //   uri: result.uri,
    //   name: result.name,
    //   type: result.mimeType || 'application/octet-stream',
    // });

    // // // 3. FormData 생성
    // const formData = new FormData();
    // formData.append("file", {
    //   uri: imageUri,
    //   name: imageResult.assets[0].fileName,
    //   type: imageResult.assets[0].type,
    // } as any);

    console.log(formData.entries())
    for (let pair of formData.entries()) {
            console.log(pair);
        }

    // 4. 서버 업로드
    const apiUrl = `${baseUrl}/flowers/${2}/image`;
    const response = await fetch(apiUrl, {
      method: "POST",
      // headers: {
      //   'Accept': '*/*',
      //   // 'Content-Type': 'multipart/form-data',
      // },
      body: formData,
      credentials: "include"

    });

    return await response.json();
  } catch (err) {
    throw err;
  }
};
// export const uploadImage = async (baseUrl: string, id: string) => {
//   try {
//     // 1. 이미지 권한 요청
//     const imgPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
//     if (!imgPerm.granted) throw new Error("이미지 접근 권한 필요");

//     // 2. 이미지 선택
//     const imageResult = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ImagePicker.MediaTypeOptions.Images,
//       quality: 1,
//     });
//     if (imageResult.canceled) throw new Error("이미지 선택 취소");

//     console.log(imageResult);
//     const imageUri = imageResult.assets[0].uri;
//     const extension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
//     const mimeType = extension === "png" ? "image/png" : "image/jpeg";
//     const fileName = imageResult.assets[0].fileName || `upload.${extension}`;

//     // 3. FormData 생성 및 Blob 변환 (🔹 수정된 부분)
//     const fileBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
//     const blob = new Blob([Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))], { type: mimeType }); // 🔹 Blob 생성
//     const formData = new FormData();
//     formData.append("file", blob, fileName); // 🔹 Blob과 파일명으로 append

//     // 디버깅용
//     console.log("===== FormData Debug =====");
//     for (let pair of formData.entries()) {
//       console.log(pair);
//     }

//     // 4. 서버 업로드
//     const apiUrl = `${baseUrl}/flowers/${id}/image`;
//     const response = await fetch(apiUrl, {
//       method: "POST",
//       headers: {
//         'Accept': '*/*',
//         // 'Content-Type': 'multipart/form-data', // 🔹 제거
//       },
//       body: formData,
//     });

//     return await response.json();
//   } catch (err) {
//     throw err;
//   }
// };


/**
 * 오디오 파일(wav, mp3 등) 선택 후 서버 업로드
 * @param baseUrl 서버 기본 URL
 * @param id path parameter
 */
export const uploadAudio = async (baseUrl: string, id: string) => {
  try {
    // 1. 오디오 파일 선택
    const audioResult = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    console.log(audioResult)
    if (audioResult.canceled) throw new Error("오디오 선택 취소");

    const audioUri = audioResult.assets[0].uri;

    // 2. FormData 생성
    const formData = new FormData();
    formData.append("file", {
      uri: audioUri,
      name: audioResult.name,
      type: audioResult.mimeType || "audio/wav",
    } as any);

    // 3. 서버 업로드
    const apiUrl = `${baseUrl}/flowers/${id}/audio`;
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    return await response.json();
  } catch (err) {
    throw err;
  }
};
