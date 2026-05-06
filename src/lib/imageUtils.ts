export const resizeImage = (file: File, maxSizeKB: number = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Initial sizing - if image is very large, scale it down
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Recursive function to find the right quality
        const getResizedData = (quality: number): string => {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          const size = Math.round((dataUrl.length * 3) / 4 / 1024); // approx size in KB

          if (size > maxSizeKB && quality > 0.1) {
            return getResizedData(quality - 0.05);
          }
          return dataUrl;
        };

        resolve(getResizedData(0.9));
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
};
