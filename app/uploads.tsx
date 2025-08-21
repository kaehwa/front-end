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
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // 최신 Expo ImagePicker 기준
      quality: 1,
    });

    if (imageResult.canceled) return false //throw new Error("이미지 선택 취소");

    console.log(imageResult)
    const imageUri = imageResult.assets[0].uri;
    const extension = imageUri.split(".").pop()?.toLowerCase() || "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";

    const req = await fetch(imageUri);        
    const blob = await req.blob();            
    const formData = new FormData();
    formData.append("file", blob, imageResult.assets[0].fileName);


    console.log(formData.entries())
    for (let pair of formData.entries()) {
            console.log(pair);
        }

    // 4. 서버 업로드
    const apiUrl = `${baseUrl}/flowers/${2}/image`;
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      credentials: "include"

    });
    console.log("image uploaded sucessfully")
    return await response.json();
  } catch (err) {
    console.log("catch error")
    console.log(err)
    return false
    //throw err;
  }
};


/**
 * 오디오 파일(wav, mp3 등) 선택 후 서버 업로드
 * @param baseUrl 서버 기본 URL
 * @param id path parameter
 */
export const uploadAudio = async (baseUrl: string, id: string) => {

  const { isRecording, recordedUri, startRecording, stopRecording, saveRecording } = useRecording();
  try {
    // 1. 오디오 파일 선택
    const audioResult = await DocumentPicker.getDocumentAsync({
      type: "audio/*",
      copyToCacheDirectory: true,
    });
    console.log(audioResult)
    if (audioResult.canceled) return false//throw new Error("오디오 선택 취소");

    const audioUri = audioResult.assets[0].uri;

    const req = await fetch(audioUri);        
    const blob = await req.blob();            
    const formData = new FormData();
    formData.append("file", blob, audioResult.assets[0].name);

    // 3. 서버 업로드
    const apiUrl = `${baseUrl}/flowers/${id}/voice`;
    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
    });

    console.log("voice uploaded sucessfully")
    return await response.json();
  } catch (err) {
    return false
    // throw err;
  }
};
