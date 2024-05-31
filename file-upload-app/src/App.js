import React, { useState } from 'react';
import Dropzone from 'react-dropzone';
import i18n from 'i18next';
import { useTranslation, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import './App.css';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      caches: ['cookie']
    },
    backend: {
      loadPath: '/locales/{{lng}}/translation.json'
    },
    react: {
      useSuspense: false
    }
  });

const App = () => {
  const { t } = useTranslation();
  const [team, setTeam] = useState('ITBA');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrop = async (acceptedFiles) => {
    setError(null);

    if (acceptedFiles.length !== 1 || !acceptedFiles[0].name.endsWith('.zip')) {
      setError('Please upload a single .zip file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', acceptedFiles[0]);
    formData.append('team', team);

    setIsUploading(true);

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.text();
      console.log(result);
    } catch (error) {
      setError('Error uploading files.');
      console.error(error);
    }

    setIsUploading(false);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="App">
      <video autoPlay loop muted className="background-video">
        <source src="/background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="content">
        <h1>{t('title')}</h1>
        <h2>{t('uploadTitle')}</h2>
        <pre>{t('instructions')}</pre>
        <Dropzone onDrop={handleDrop} accept=".zip">
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps({ className: 'dropzone' })}>
              <input {...getInputProps()} />
              <p>{t('dragDrop')}</p>
            </div>
          )}
        </Dropzone>
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="ITBA">ITBA</option>
          <option value="NIP">NIP</option>
        </select>
        <button onClick={handleDrop}>{t('uploadButton')}</button>
        {isUploading && <p>{t('uploadingTitle')}</p>}
        {error && <p className="error">{error}</p>}
        <div className="language-switcher">
          <button onClick={() => changeLanguage('en')}>English</button>
          <button onClick={() => changeLanguage('fr')}>French</button>
          <button onClick={() => changeLanguage('de')}>German</button>
        </div>
      </div>
    </div>
  );
};

export default App;
