const ngrok = require('ngrok');
const fs = require('fs');
const path = require('path');

const API_PORT = 3000;
const FRONTEND_PORT = 8100;

function saveUrlsToFile(apiUrl, frontendUrl) {
    const content = `
# URLs d'accès Mite & Zard
    
## API (Backend)
${apiUrl}

## Application (Frontend)
${frontendUrl}

## Instructions
- Partagez ces URLs avec vos testeurs
- Aucun mot de passe n'est nécessaire !
- Ces URLs sont valables jusqu'à l'arrêt du serveur
    `;
    
    fs.writeFileSync(path.join(__dirname, 'access-urls.md'), content);
    console.log('✅ URLs sauvegardées dans le fichier access-urls.md');
}

async function startNgrok() {
    try {
        console.log('🚀 Démarrage des tunnels Ngrok...');
        
        const apiUrl = await ngrok.connect({
            addr: API_PORT,
            proto: 'http'
        });
        console.log(`✅ API disponible à: ${apiUrl}`);
        
        const frontendUrl = await ngrok.connect({
            addr: FRONTEND_PORT,
            proto: 'http'
        });
        console.log(`✅ Application frontend disponible à: ${frontendUrl}`);
        
        console.log('\n📱 IMPORTANT: Partagez ces URLs avec vos testeurs !');
        console.log('🎉 Aucun mot de passe n\'est nécessaire avec Ngrok');
        
        saveUrlsToFile(apiUrl, frontendUrl);
        
        console.log('\n⚠️ Appuyez sur Ctrl+C pour arrêter les tunnels\n');
    } catch (error) {
        console.error('❌ Erreur lors du démarrage de Ngrok:', error);
    }
}

startNgrok(); 