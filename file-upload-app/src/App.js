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
  const [team, setTeam] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleDrop = (acceptedFiles) => {
    setError(null);

    if (acceptedFiles.length !== 1 || !acceptedFiles[0].name.endsWith('.zip')) {
      setError('Please upload a single .zip file.');
      return;
    }

    setFile(acceptedFiles[0]);
  };

  const handleUpload = async () => {
    if (!team) {
      setError('Please pick a team.');
      return;
    }

    if (!file) {
      setError('Please upload a file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
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
              <p>{file ? file.name : t('dragDrop')}</p>
            </div>
          )}
        </Dropzone>
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="" disabled>{t('pickTeam')}</option>
          <option value="VOLTAGEGAMING">VOLTAGE GAMING</option>
          <option value="TEAMAKUAKU">TEAM AKU AKU</option>
          <option value="OVERLOOKEDENTERTAINMENT">OVERLOOKED ENTERTAINMENT</option>
          <option value="KHESPORTS">KH ESPORTS</option>
          <option value="ZINX">ZINX</option>
          <option value="KUNGFUCOUNCIL">KUNGFUCOUNCIL</option>
          <option value="UNGUARDABLE">UNGUARDABLE</option>
          <option value="AXIMZERO">AXIMZERO</option>
          <option value="REDKNIGHTSONS">REDKNIGHTSONS</option>
          <option value="MUADDIB5">MUAD'DIB 5</option>
          <option value="NGGMAIN">NGG MAIN</option>
          <option value="THEFURIOUSFIVE">THE FURIOUS FIVE</option>
          <option value="DIVINIUMESPORTS">DIVINIUM ESPORTS</option>
          <option value="MYSTICGAMING">MYSTIC GAMING</option>
          <option value="PANNUHUONE">PANNUHUONE</option>
          <option value="ENVISION ESPORTS">ENVISIONESPORTS</option>
          <option value="OSPREYORDER">OSPREY ORDER</option>
          <option value="NORDCO">NORD & CO</option>
          <option value="RUDYKOSTELECACADEMY">RUDY KOSTELEC ACADEMY</option>
          <option value="DEADSHOTESPORTS">DEADSHOT ESPORTS</option>
          <option value="PODEROSATEAMCLAW">PODEROSA TEAM CLAW</option>
          <option value="NONPROPHETCOMPANY">NON PROPHET COMPANY</option>
          <option value="UCANESPORTS">UCAN ESPORTS</option>
          <option value="TEAM5GOATS">TEAM 5GOATS</option>
          <option value="MELILLATITANS">MELILLA TITANS</option>
          <option value="GO2LIMITSOG">GO2LIMITS OG</option>
          <option value="FAKEESPORT">FAKE ESPORT</option>
          <option value="N8M">N8M</option>
          <option value="TEAM300">TEAM 300</option>
          <option value="T3BGLADIATORS">T3B GLADIATORS</option>
          <option value="BRESTESPORT">BREST ESPORT</option>
          <option value="QVGESPORTSACADEMY">QVG ESPORTS ACADEMY</option>
          <option value="OWNEDESPORT">OWNED ESPORT</option>
          <option value="NIGHTLOKIESPORT">NIGHT LOKI ESPORT</option>
          <option value="PINGUESPORTS">PINGU ESPORTS</option>
        </select>
        <button onClick={handleUpload}>{t('uploadButton')}</button>
        {isUploading && <p>{t('uploadingTitle')}</p>}
        {error && <p className="error">{error}</p>}
        <div className="language-switcher">
          <button onClick={() => changeLanguage('en')}>English</button>
          <button onClick={() => changeLanguage('fr')}>French</button>
          <button onClick={() => changeLanguage('de')}>German</button>
        </div>
        <div className="discord-link">
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
            {t('discordLink')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;





