import React, { useState } from 'react';
import LocalizedStrings from 'react-localization';
import JSZip from 'jszip';
import { S3 } from 'aws-sdk';
import './App.css';
import backgroundVideo from './background.mp4';

let strings = new LocalizedStrings({
  en: {
    title: "File Upload",
    uploadTitle: "Upload Match Replay",
    instructions: `1. Open the match replay folder.
    2. Enter the folder of the match you want to upload.
    3. Select all files.
    4. Use 7zip or your software of choice to compress the files into a zip file.
    5. Rename the file: 'YOURTEAMNAME-vs-ENEMYTEAMNAME-(whatever playday you're on).zip - if you have multiple matches (bo3, bo5) then add '-MATCH-(the match number)' after the enemy team name.
    6. Upload the file.
    7. Pick your team name.
    8. Press upload button.
    9. Wait for upload confirmation.
    10. You are free to close your browser.
    IMPORTANT! IF YOU HAD A REHOST YOU WILL NEED TO COMBINE YOUR REPLAY FOLDERS. TAKE ALL THE PLAYED ROUNDS FROM THE REPLAY FOLDER BEFORE THE REHOST, AND ALL THE PLAYED ROUNDS FROM THE FOLDER AFTER THE REHOST AND PLACE THEM ALL IN ONE FOLDER BEFORE ZIPPING. THEN CONTINUE FROM STEP 5. It's EXTREMELY important you do this. If you do not do this correctly it could result in incorrect stats for your team/incorrect final score for that match. If you need assistance please open a support ticket in our discord!`,
    uploadButton: "Upload",
    uploadingTitle: "Uploading...",
    waitMessage: "Please wait while your files are being uploaded.",
    discordLink: "Join our Discord"
  },
  fr: {
    title: "Téléchargement de fichiers",
    uploadTitle: "Télécharger le replay de match",
    instructions: `1. Ouvrez le dossier de replay de match.
    2. Entrez dans le dossier du match que vous souhaitez télécharger.
    3. Sélectionnez tous les fichiers.
    4. Utilisez 7zip ou votre logiciel préféré pour compresser les fichiers en un fichier zip.
    5. Renommez le fichier : 'YOURTEAMNAME-vs-ENEMYTEAMNAME-(quel que soit le jour de jeu).zip - si vous avez plusieurs matchs (bo3, bo5), ajoutez '-MATCH-(le numéro du match)' après le nom de l'équipe adverse.
    6. Téléchargez le fichier.
    7. Choisissez le nom de votre équipe.
    8. Appuyez sur le bouton de téléchargement.
    9. Attendez la confirmation du téléchargement.
    10. Vous êtes libre de fermer votre navigateur.
    IMPORTANT ! SI VOUS AVEZ EU UN REHOST, VOUS DEVEZ COMBINER VOS DOSSIERS DE REPLAY. PRENEZ TOUS LES TOURS JOUÉS DU DOSSIER DE REPLAY AVANT LE REHOST ET TOUS LES TOURS JOUÉS DU DOSSIER APRÈS LE REHOST ET PLACEZ-LES TOUS DANS UN SEUL DOSSIER AVANT DE ZIPPING. PUIS CONTINUEZ À PARTIR DE L'ÉTAPE 5. Il est EXTREMEMENT important que vous fassiez cela correctement. Si vous ne le faites pas correctement, cela pourrait entraîner des statistiques incorrectes pour votre équipe / un score final incorrect pour ce match. Si vous avez besoin d'aide, veuillez ouvrir un ticket d'assistance sur notre discord !`,
    uploadButton: "Télécharger",
    uploadingTitle: "Téléchargement...",
    waitMessage: "Veuillez patienter pendant le téléchargement de vos fichiers.",
    discordLink: "Rejoignez notre Discord"
  },
  de: {
    title: "Datei-Upload",
    uploadTitle: "Match-Wiederholung hochladen",
    instructions: `1. Öffnen Sie den Ordner mit den Match-Wiederholungen.
    2. Gehen Sie in den Ordner des Matches, das Sie hochladen möchten.
    3. Wählen Sie alle Dateien aus.
    4. Verwenden Sie 7zip oder Ihre bevorzugte Software, um die Dateien in eine Zip-Datei zu komprimieren.
    5. Benennen Sie die Datei um: 'YOURTEAMNAME-vs-ENEMYTEAMNAME-(welcher Spieltag auch immer).zip - wenn Sie mehrere Matches haben (bo3, bo5), fügen Sie '-MATCH-(die Matchnummer)' nach dem Namen des gegnerischen Teams hinzu.
    6. Laden Sie die Datei hoch.
    7. Wählen Sie Ihren Teamnamen.
    8. Drücken Sie die Upload-Taste.
    9. Warten Sie auf die Upload-Bestätigung.
    10. Sie können Ihren Browser schließen.
    WICHTIG! WENN SIE EINEN REHOST HATTEN, MÜSSEN SIE IHRE WIEDERHOLUNGSORDNER KOMBINIEREN. NEHMEN SIE ALLE GESPIELTEN RUNDEN AUS DEM WIEDERHOLUNGSORDNER VOR DEM REHOST UND ALLE GESPIELTEN RUNDEN AUS DEM ORDNER NACH DEM REHOST UND LEGEN SIE SIE ALLE IN EINEN ORDNER, BEVOR SIE ZIP. DANN FAHREN SIE MIT SCHRITT 5 FORT. Es ist EXTREM wichtig, dass Sie dies korrekt tun. Wenn Sie dies nicht korrekt tun, kann dies zu falschen Statistiken für Ihr Team / falschen Endergebnissen für dieses Match führen. Wenn Sie Hilfe benötigen, öffnen Sie bitte ein Support-Ticket in unserem Discord!`,
    uploadButton: "Hochladen",
    uploadingTitle: "Hochladen...",
    waitMessage: "Bitte warten Sie, während Ihre Dateien hochgeladen werden.",
    discordLink: "Treten Sie unserem Discord bei"
  }
});

const S3_BUCKET = 'tlmrisserver/pre-exported-data';
const REGION = 'us-east-1'; // Adjust as necessary

const s3 = new S3({
  region: REGION
});

function App() {
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('en');

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

      const fileKey = zipFile.name.replace('.zip', '');

      for (const fileName of recFiles) {
        const fileData = await content.files[fileName].async('uint8array');
        await s3.upload({
          Bucket: S3_BUCKET,
          Key: `${fileKey}/${fileName}`,
          Body: fileData
        }).promise();
      }

      alert('Upload successful!');
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
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
