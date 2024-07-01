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
  "Ace", "Amaru", "Ash", "Blackbeard", "Brava", "Buck", "Blitz", "Capitão", "Deimos", 
  "Dokkaebi", "Finka", "Flores", "Fuze", "Glaz", "Gridlock", "Grim", "Hibana", 
  "Iana", "IQ", "Jackal", "Kali", "Lion", "Maverick", "Montagne", "Nøkk", "Nomad", 
  "Osa", "Ram", "Sledge", "Sens", "Striker", "Thatcher", "Thermite", "Twitch", "Ying", 
  "Zero", "Zofia", "NoBan"
];

const defensiveOperators = [
  "Alibi", "Aruni", "Azami", "Bandit", "Caveira", "Clash", "Castle", "Doc", "Echo", "Ela", "Fenrir", 
  "Frost", "Goyo", "Jäger", "Kaid", "Kapkan", "Lesion", "Maestro", "Melusi", "Mira", "Mozzie", 
  "Mute", "Oryx", "Pulse", "Rook", "Sentry", "Smoke", "Solis", "Tachanka", "Thorn", "Thunderbird", 
  "Tubarao","Valkyrie", "Vigil", "Wamai", "Warden", "NoBan"
];

const playdays = Array.from({ length: 9 }, (_, i) => i + 1);
const matches = Array.from({ length: 5 }, (_, i) => i + 1);

const App = () => {
  const { t } = useTranslation();
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [file, setFile] = useState(null);
  const [mossFiles, setMossFiles] = useState([]);
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

  const handleMossDrop = (acceptedFiles) => {
    const zipFiles = acceptedFiles.filter(file => file.name.endsWith('.zip'));
    setMossFiles(zipFiles);
    if (zipFiles.length !== acceptedFiles.length) {
      toast.error(t('onlyZipAllowed'));
    }
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

    const uniqueBans = new Set([attackingBan1, attackingBan2, defensiveBan1, defensiveBan2].filter(ban => ban !== 'NoBan'));
    if (uniqueBans.size !== 4 - [attackingBan1, attackingBan2, defensiveBan1, defensiveBan2].filter(ban => ban === 'NoBan').length) {
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

  const uploadMossFiles = async () => {
    if (mossFiles.length === 0) {
      toast.error(t('noFilesSelected'));
      return;
    }
    const formData = new FormData();
    mossFiles.forEach(file => {
      formData.append('files', file);
    });
  
    setIsUploading(true);
    try {
      const response = await fetch('/upload-moss', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('MOSS Upload failed');
      }
      toast.success('MOSS files uploaded successfully!');
    } catch (error) {
      toast.error('Error uploading MOSS files.');
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
          <option value="BEE">BEE ESPORTS</option>
          <option value="BMB">BMB</option>
          <option value="COF">COFFEIN ESPORTS</option>
          <option value="DVT">DAVINCI ESPORTS TALENTS</option>
          <option value="FAL">FALKE ESPORTS</option>
          <option value="G2L">GO2LIMITS ESPORTS</option>
          <option value="INF">INF ESPORTS</option>
          <option value="LSF">LARSISTFALLOBST</option>
          <option value="MYT">MYTH ESPORT</option>
          <option value="NXT">NXT</option>
          <option value="OWN">OWNED ESPORTS</option>
          <option value="PAN">PANNUHUONE</option>
          <option value="PNG">PINGU ESPORTS</option>
          <option value="SHE">SOULS HEART ESPORTS</option>
          <option value="SOK">SOKUDO ESPORTS</option>
          <option value="STX">STAXS COPPER CLAN</option>
          <option value="TRP">TEAM RUPTURE</option>
          <option value="T5G">TEAM 5GOATS</option>
          <option value="WLD">WILDCATS ESPORTS</option>
          <option value="ICE">ICE FORCE ESPORTS</option>
        </select>
        <select value={team2} onChange={(e) => setTeam2(e.target.value)}>
          <option value="" disabled>{t('pickTeam')}</option>
          <option value="BEE">BEE ESPORTS</option>
          <option value="BMB">BMB</option>
          <option value="COF">COFFEIN ESPORTS</option>
          <option value="DVT">DAVINCI ESPORTS TALENTS</option>
          <option value="FAL">FALKE ESPORTS</option>
          <option value="G2L">GO2LIMITS ESPORTS</option>
          <option value="INF">INF ESPORTS</option>
          <option value="LSF">LARSISTFALLOBST</option>
          <option value="MYT">MYTH ESPORT</option>
          <option value="NXT">NXT</option>
          <option value="OWN">OWNED ESPORTS</option>
          <option value="PAN">PANNUHUONE</option>
          <option value="PNG">PINGU ESPORTS</option>
          <option value="SHE">SOULS HEART ESPORTS</option>
          <option value="SOK">SOKUDO ESPORTS</option>
          <option value="STX">STAXS COPPER CLAN</option>
          <option value="TRP">TEAM RUPTURE</option>
          <option value="T5G">TEAM 5GOATS</option>
          <option value="WLD">WILDCATS ESPORTS</option>
          <option value="ICE">ICE FORCE ESPORTS</option>
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

        <h2>{t('upload MOSS Files')}</h2>
        <Dropzone onDrop={handleMossDrop} accept=".zip" multiple>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps({ className: 'dropzone' })}>
              <input {...getInputProps()} />
              <p>{mossFiles.length > 0 ? mossFiles.map(file => file.name).join(', ') : t('Drag and Drop MOSS')}</p>
            </div>
          )}
        </Dropzone>
        <button onClick={uploadMossFiles} disabled={isUploading || mossFiles.length === 0}>
          {isUploading ? t('uploadingMOSS') : t('uploadMOSSButton')}
        </button>

        <div className="language-switcher">
          <button onClick={() => changeLanguage('en')}>English</button>
          <button onClick={() => changeLanguage('fr')}>French</button>
          <button onClick={() => changeLanguage('de')}>German</button>
        </div>
        <div className="discord-link">
          <a href="https://discord.gg/hqSzN8nVqN" target="_blank" rel="noopener noreferrer">
            {t('discordLink')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default App;
