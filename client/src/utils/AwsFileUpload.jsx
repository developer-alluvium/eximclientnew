import axios from "./axiosConfig";

export const handleFileUpload = async (
  e,
  folderName,
  formikKey,
  formik,
  setFileSnackbar
) => {
  if (e.target.files.length === 0) {
    alert("No file selected");
    return;
  }

  try {
    const uploadedFiles = [];

    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderName", folderName);

      // Upload via backend API
      const response = await axios.post(
        `${process.env.REACT_APP_API_STRING}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Store the S3 URL in the uploadedFiles array
      if (response.data && response.data.Location) {
        uploadedFiles.push(response.data.Location);
      }
    }

    // Update formik values with the uploaded file URLs
    formik.setValues((values) => ({
      ...values,
      [formikKey]: uploadedFiles,
    }));

    setFileSnackbar(true);

    setTimeout(() => {
      setFileSnackbar(false);
    }, 3000);
  } catch (err) {
    console.error("Error uploading files:", err);
    alert("Error uploading files. Please try again.");
  }
};

export const uploadFileToS3 = async (file, folderName) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folderName", folderName);

  const response = await axios.post(
    `${process.env.REACT_APP_API_STRING}/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  // Return the data object which contains Location, matching the previous S3 promise result structure
  return response.data;
};
