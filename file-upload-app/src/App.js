import React, { useState } from 'react';
import LocalizedStrings from 'react-localization';
import JSZip from 'jszip';
import './App.css';
import backgroundVideo from './background.mp4';

let strings = new LocalizedStrings({
  en: {
    title: "File Upload",
    uploadTitle: "Upload Match Replay",
    instructions: `1. Open the match replay folder.\n
    2. Enter the folder of the match you want to upload.\n
    3. Select all files.\n
    4. Use 7zip or your software of choice to compress the files into a zip file.\n
    5. Rename the file: 'YOURTEAMNAME-vs-ENEMYTEAMNAME-(whatever playday you're on).zip\n - if you have multiple matches (bo3, bo5) then add '-MATCH-(the match number)' after the enemy team name.\n
    6. Upload the file.\n
    7. Pick your team name.\n
    8. Press upload button.\n
    9. Wait for upload confirmation.\n
    10. You are free to close your browser.\n
    \nIMPORTANT! IF YOU HAD A REHOST YOU WILL NEED TO COMBINE YOUR REPLAY FOLDERS.\n TAKE ALL THE PLAYED ROUNDS FROM THE REPLAY FOLDER BEFORE THE REHOST,\n AND ALL THE PLAYED ROUNDS FROM THE FOLDER AFTER THE REHOST\n AND PLACE THEM ALL IN ONE FOLDER BEFORE ZIPPING. THEN CONTINUE FROM STEP 5.\n It's EXTREMELY important you do this. If you do not do this correctly\n it could result in incorrect stats for your team/incorrect final score for that match.\n If you need assistance please open a support ticket in our discord!`,
    uploadButton: "Upload",
    uploadingTitle: "Uploading...",
    waitMessage: "Please wait while your files are being uploaded.",
    discordLink: "Join our Discord"
  },
  fr: {
    title: "Téléchargement de fichiers",
    uploadTitle: "Télécharger le replay de match",
    instructions: `1. Ouvrez le dossier de replay de match.\n
    2. Entrez dans le dossier du match que vous souhaitez télécharger.\n
    3. Sélectionnez tous les fichiers.\n
    4. Utilisez 7zip ou votre logiciel préféré pour compresser les fichiers en un fichier zip.\n
    5. Renommez le fichier : 'YOURTEAMNAME-vs-ENEMYTEAMNAME-(quel que soit le jour de jeu).zip - si vous avez plusieurs matchs (bo3, bo5), ajoutez '-MATCH-(le numéro du match)' après le nom de l'équipe adverse.\n
    6. Téléchargez le fichier.\n
    7. Choisissez le nom de votre équipe.\n
    8. Appuyez sur le bouton de téléchargement.\n
    9. Attendez la confirmation du téléchargement.\n
    10. Vous êtes libre de fermer votre navigateur.\n
    IMPORTANT ! SI VOUS AVEZ EU UN REHOST, VOUS DEVEZ COMBINER VOS DOSSIERS DE REPLAY. PRENEZ TOUS LES TOURS JOUÉS DU DOSSIER DE REPLAY AVANT LE REHOST ET TOUS LES TOURS JOUÉS DU DOSSIER APRÈS LE REHOST ET PLACEZ-LES TOUS DANS UN SEUL DOSSIER AVANT DE ZIPPING. PUIS CONTINUEZ À PARTIR DE L'ÉTAPE 5. Il est EXTREMEMENT important que vous fassiez cela correctement. Si vous ne le faites pas correctement, cela pourrait entraîner des statistiques incorrectes pour votre équipe / un score final incorrect pour ce match. Si vous avez besoin d'aide, veuillez ouvrir un ticket d'assistance sur notre discord !`,
    uploadButton: "Télécharger",
    uploadingTitle: "Téléchargement...",
    waitMessage: "Veuillez patienter pendant le téléchargement de vos fichiers.",
    discordLink: "Rejoignez notre Discord"
  },
  de: {
    title: "Datei-Upload",
    uploadTitle: "Match-Wiederholung hochladen",
    instructions: `1. Öffnen Sie den Ordner mit den Match-Wiederholungen.\n
    2. Gehen Sie in den Ordner des Matches, das Sie hochladen möchten.\n
    3. Wählen Sie alle Dateien aus.\n
    4. Verwenden Sie 7zip oder Ihre bevorzugte Software, um die Dateien in eine Zip-Datei zu komprimieren.\n
    5. Benennen Sie die Datei um: 'YOURTEAMNAME-vs-ENEMYTEAMNAME-(welcher Spieltag auch immer).zip - wenn Sie mehrere Matches haben (bo3, bo5), fügen Sie '-MATCH-(die Matchnummer)' nach dem Namen des gegnerischen Teams hinzu.\n
    6. Laden Sie die Datei hoch.\n
    7. Wählen Sie Ihren Teamnamen.\n
    8. Drücken Sie die Upload-Taste.\n
    9. Warten Sie auf die Upload-Bestätigung.\n
    10. Sie können Ihren Browser schließen.\n
    WICHTIG! WENN SIE EINEN REHOST HATTEN, MÜSSEN SIE IHRE WIEDERHOLUNGSORDNER KOMBINIEREN. NEHMEN SIE ALLE GESPIELTEN RUNDEN AUS DEM WIEDERHOLUNGSORDNER VOR DEM REHOST UND ALLE GESPIELTEN RUNDEN AUS DEM ORDNER NACH DEM REHOST UND LEGEN SIE SIE ALLE IN EINEN ORDNER, BEVOR SIE ZIP. DANN FAHREN SIE MIT SCHRITT 5 FORT. Es ist EXTREM wichtig, dass Sie dies korrekt tun. Wenn Sie dies nicht korrekt tun, kann dies zu falschen Statistiken für Ihr Team / falschen Endergebnissen für dieses Match führen. Wenn Sie Hilfe benötigen, öffnen Sie bitte ein Support-Ticket in unserem Discord!`,
    uploadButton: "Hochladen",
    uploadingTitle: "Hochladen...",
    waitMessage: "Bitte warten Sie, während Ihre Dateien hochgeladen werden.",
    discordLink: "Treten Sie unserem Discord bei"
  }
});

const S3_BUCKET = 's3://tlmrisserver/pre-exported-data';
const REGION = 'us-east-1'; // Adjust as necessary

function App() {
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('en');
  const [teamName, setTeamName] = useState('ITBA');

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.zip')) {
      setZipFile(file);
      setError('');
    } else {
      setError('Please upload a zip file.');
    }
  };

  const handleUpload = async () => {
    if (!zipFile) {
      setError('No file selected.');
      return;
    }

    if (!teamName) {
      setError('No team selected.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const zip = new JSZip();
      const content = await zip.loadAsync(zipFile);
      const allFiles = Object.keys(content.files);
      const recFiles = allFiles.filter(file => file.endsWith('.rec'));

      if (recFiles.length !== allFiles.length) {
        throw new Error('The zip file contains non-.rec files.');
      }

      const fileKey = `${zipFile.name.replace('.zip', '')}-${teamName}`;

      const tempDir = '/tmp/upload'; // Directory to extract the files temporarily
      await zip.extractAllTo(tempDir, true);

      for (const fileName of recFiles) {
        const filePath = `${tempDir}/${fileName}`;
        await executeAwsCliUpload(filePath, fileKey, fileName);
      }

      alert('Upload successful!');
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const executeAwsCliUpload = async (filePath, fileKey, fileName) => {
    const exec = require('child_process').exec;
    return new Promise((resolve, reject) => {
      const command = `aws s3 cp ${filePath} ${S3_BUCKET}/${fileKey}/${fileName}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    strings.setLanguage(lang);
  };

  return (
    <div className="App">
      <video className="background-video" autoPlay loop muted>
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      <div className="content">
        <div className="language-select">
          <button onClick={() => changeLanguage('en')}>English</button>
          <button onClick={() => changeLanguage('fr')}>Français</button>
          <button onClick={() => changeLanguage('de')}>Deutsch</button>
        </div>
        <h1>{strings.title}</h1>
        <h2>{strings.uploadTitle}</h2>
        <pre>{strings.instructions}</pre>
        <div>
          <label htmlFor="team-select">Select your team:</label>
          <select id="team-select" value={teamName} onChange={(e) => setTeamName(e.target.value)}>
            <option value="ITBA">ITBA</option>
            <option value="NIP">NIP</option>
          </select>
        </div>
        <input type="file" accept=".zip" onChange={handleFileChange} />
        <button onClick={handleUpload}>{strings.uploadButton}</button>
        {uploading && <div>{strings.uploadingTitle}<progress /></div>}
        {error && <div className="error">{error}</div>}
        <a href="https://discord.gg/yourdiscordlink">{strings.discordLink}</a>
      </div>
    </div>
  );
}

export default App;
