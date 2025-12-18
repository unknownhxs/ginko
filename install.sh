#!/bin/bash
# Script d'installation Ginko Dashboard

echo "╔════════════════════════════════════════╗"
echo "║  🌿 Installation Ginko Dashboard 🌿  ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Vérifier Node.js
echo "✓ Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé!"
    echo "   Téléchargez Node.js: https://nodejs.org"
    exit 1
fi
echo "   ✓ Node.js $(node -v)"

# Vérifier npm
echo ""
echo "✓ Vérification de npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé!"
    exit 1
fi
echo "   ✓ npm $(npm -v)"

# Copier .env.example
echo ""
echo "✓ Configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   ✓ Fichier .env créé (à configurer)"
    else
        echo "   ⚠ .env.example non trouvé"
    fi
else
    echo "   ✓ Fichier .env existe"
fi

# Installer les dépendances
echo ""
echo "✓ Installation des dépendances..."
npm install

# Afficher les instructions
echo ""
echo "╔════════════════════════════════════════╗"
echo "║  Installation Terminée! 🎉            ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Ouvrir le fichier .env"
echo "   2. Ajouter vos identifiants Discord:"
echo "      - DISCORD_CLIENT_ID"
echo "      - DISCORD_CLIENT_SECRET"
echo "   3. Lancer le serveur: node server-new.js"
echo "   4. Accéder: http://localhost:8000"
echo ""
echo "📚 Documentation:"
echo "   • README_REFONTE.md - Documentation technique"
echo "   • GUIDE_UTILISATION.md - Guide d'utilisation"
echo "   • REFONTE_SUMMARY.md - Résumé exécutif"
echo ""
