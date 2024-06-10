import React, { useState } from 'react';
import Dropzone from 'react-dropzone';
import i18n from 'i18next';
import { useTranslation, initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
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

const attackingOperators = [
  "Sledge", "Thatcher", "Ash", "Thermite", "Twitch", "Montagne", "Glaz",
  "Fuze", "Blitz", "IQ", "Buck", "Blackbeard", "Capitao", "Hibana", "Jackal",
  "Ying", "Zofia", "Dokkaebi", "Lion", "Finka", "Maverick", "Nomad", "Gridlock",
  "Nokk", "Amaru", "Kali", "Iana", "Ace", "Zero", "Flores", "Osa", "Sens", "Grim",
  "Brava", "Ram", "Deimos"
];

const defensiveOperators = [
  "Smoke", "Mute", "Castle", "Pulse", "Doc", "Rook", "Jager", "Bandit",
  "Frost", "Valkyrie", "Caveira", "Echo", "Mira", "Lesion", "Ela", "Vigil",
  "Maestro", "Alibi", "Clash", "Kaid", "Mozzie", "Warden", "Goyo", "Wamai",
  "Oryx", "Melusi", "Aruni", "Thunderbird", "Thorn", "Azami", "Solace"
];

const playdays = Array.from({ length: 9 }, (_, i) => i + 1);
const matches = Array.from({ length: 5 }, (_, i) => i + 1);

const App = () => {
  const { t } = useTranslation();
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [attackingBan1, setAttackingBan1] = useState('');
  const [attackingBan2, setAttackingBan2] = useState('');
  const [defensiveBan1, setDefensiveBan1] = useState('');
  const [defensiveBan2, setDefensiveBan2] = useState('');
  const [playday, setPlayday] = useState('');
  const [match, setMatch] = useState('');

  const handleDrop = (acceptedFiles) => {
    setError(null);

    if (acceptedFiles.length !== 1 || !acceptedFiles[0].name.endsWith('.zip')) {
      setError('Please upload a single .zip file.');
      return;
    }

    setFile(acceptedFiles[0]);
  };

  const handleUpload = async () => {
    if (!team1 || !team2) {
      setError('Please pick both teams.');
      return;
    }

    if (team1 === team2) {
      setError('Teams must be different.');
      return;
    }

    if (!file) {
      setError('Please upload a file.');
      return;
    }

    if (!attackingBan1 || !attackingBan2 || !defensiveBan1 || !defensiveBan2 || !playday || !match) {
      setError('Please fill all dropdowns.');
      return;
    }

    if (new Set([attackingBan1, attackingBan2, defensiveBan1, defensiveBan2]).size !== 4) {
      setError('Bans must be unique.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('team1', team1);
    formData.append('team2', team2);
    formData.append('attackingBan1', attackingBan1);
    formData.append('attackingBan2', attackingBan2);
    formData.append('defensiveBan1', defensiveBan1);
    formData.append('defensiveBan2', defensiveBan2);
    formData.append('playday', playday);
    formData.append('match', match);

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
      toast.success('File uploaded successfully!');
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
      <ToastContainer />
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
        <select value={team1} onChange={(e) => setTeam1(e.target.value)}>
          <option value="" disabled>{t('pickTeam')}</option>
          <option value="VOLTAGEGAMING">VOLTAGE GAMING</option>
          <option value="TEAMAKUAKU">TEAM AKU AKU</option>
          <option value="OVERLOOKEDENTERTAINMENT">OVERLOOKED ENTERTAINMENT</option>
          <option value="KHESPORTS">KH ESPORTS</option>
          <option value="ZINX">ZINX</option>
          <option value="KUNGFUCOUNCIL">KUNGFU COUNCIL</option>
          <option value="UNGUARDABLE">UNGUARDABLE</option>
          <option value="AXIMZERO">AXIM ZERO</option>
          <option value="REDKNIGHTSONS">RED KNIGHT SONS</option>
          <option value="MUADDIB5">MUAD'DIB 5</option>
          <option value="NGGMAIN">NGG MAIN</option>
          <option value="THEFURIOUSFIVE">THE FURIOUS FIVE</option>
          <option value="DIVINIUMESPORTS">DIVINIUM ESPORTS</option>
          <option value="MYSTICGAMING">MYSTIC GAMING</option>
          <option value="PANNUHUONE">PANNUHUONE</option>
          <option value="ENVISION ESPORTS">ENVISION ESPORTS</option>
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
        <select value={team2} onChange={(e) => setTeam2(e.target.value)}>
          <option value="" disabled>{t('pickTeam')}</option>
          <option value="VOLTAGEGAMING">VOLTAGE GAMING</option>
          <option value="TEAMAKUAKU">TEAM AKU AKU</option>
          <option value="OVERLOOKEDENTERTAINMENT">OVERLOOKED ENTERTAINMENT</option>
          <option value="KHESPORTS">KH ESPORTS</option>
          <option value="ZINX">ZINX</option>
          <option value="KUNGFUCOUNCIL">KUNGFU COUNCIL</option>
          <option value="UNGUARDABLE">UNGUARDABLE</option>
          <option value="AXIMZERO">AXIM ZERO</option>
          <option value="REDKNIGHTSONS">RED KNIGHT SONS</option>
          <option value="MUADDIB5">MUAD'DIB 5</option>
          <option value="NGGMAIN">NGG MAIN</option>
          <option value="THEFURIOUSFIVE">THE FURIOUS FIVE</option>
          <option value="DIVINIUMESPORTS">DIVINIUM ESPORTS</option>
          <option value="MYSTICGAMING">MYSTIC GAMING</option>
          <option value="PANNUHUONE">PANNUHUONE</option>
          <option value="ENVISION ESPORTS">ENVISION ESPORTS</option>
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
        <select value={attackingBan1} onChange={(e) => setAttackingBan1(e.target.value)}>
          <option value="" disabled>{t('attackingBan1')}</option>
          {attackingOperators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
        <select value={attackingBan2} onChange={(e) => setAttackingBan2(e.target.value)}>
          <option value="" disabled>{t('attackingBan2')}</option>
          {attackingOperators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
        <select value={defensiveBan1} onChange={(e) => setDefensiveBan1(e.target.value)}>
          <option value="" disabled>{t('defensiveBan1')}</option>
          {defensiveOperators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
        <select value={defensiveBan2} onChange={(e) => setDefensiveBan2(e.target.value)}>
          <option value="" disabled>{t('defensiveBan2')}</option>
          {defensiveOperators.map(op => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
        <select value={playday} onChange={(e) => setPlayday(e.target.value)}>
          <option value="" disabled>{t('playday')}</option>
          {playdays.map(day => (
            <option key={day} value={day}>{day}</option>
          ))}
        </select>
        <select value={match} onChange={(e) => setMatch(e.target.value)}>
          <option value="" disabled>{t('match')}</option>
          {matches.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
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
