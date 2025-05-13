const { db } = require('../db');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = '8f7b3c2a1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'lambard36@gmail.com',  
    pass: 'bofx qumq ennd nbmn',  
  },
  debug: true, 
});

transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Erreur de configuration du transporteur email:', error);
  } else {
    console.log('✅ Serveur mail prêt à envoyer des messages');
  }
});

const envoyerEmailBienvenue = async (email, nom) => {
  try {
    console.log(`📧 Tentative d'envoi d'email à ${email}...`);
    
    const mailOptions = {
      from: '"Mite & Zard" <mailmitezard@gmail.com>',
      to: email,
      subject: '🎉 Bienvenue chez Mite & Zard !',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #e63946;">Bonjour ${nom},</h2>
          <p>Merci de vous être inscrit chez <strong>Mite & Zard</strong> !</p>
          <p>Nous sommes ravis de vous compter parmi nous.</p>
          <br>
          <p>🍽️ À bientôt pour déguster nos spécialités portugaises !</p>
          <hr>
          <p style="font-size: 12px; color: #555;">Cet e-mail vous a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email de bienvenue envoyé à ${email}. ID du message: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email :`, error);
    return { success: false, error: error.message };
  }
};

const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email requis pour le test' });
    }
    
    console.log(`🧪 Test d'envoi d'email à ${email}...`);
    
    const testMailOptions = {
      from: '"Mite & Zard - Test" <mailmitezard@gmail.com>',
      to: email,
      subject: '🧪 Test de fonctionnalité email',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #4CAF50;">Test d'envoi d'email</h2>
          <p>Ceci est un email de test pour vérifier le bon fonctionnement du service d'envoi d'emails.</p>
          <p>Si vous recevez cet email, cela signifie que tout fonctionne correctement !</p>
          <hr>
          <p style="font-size: 12px; color: #555;">Test effectué le ${new Date().toLocaleString()}</p>
        </div>
      `,
    };
    
    const info = await transporter.sendMail(testMailOptions);
    console.log(`✅ Email de test envoyé. ID du message: ${info.messageId}`);
    
    res.status(200).json({
      message: `Email de test envoyé avec succès à ${email}`,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('❌ Erreur lors du test d\'envoi d\'email:', error);
    res.status(500).json({
      message: 'Échec du test d\'envoi d\'email',
      error: error.message
    });
  }
};

const registerUser = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      email,
      motDePasse,
      telephone,
      adresse,
      adresseComplementaire,
      ville,
      codePostal,
    } = req.body;

    console.log('📥 Données reçues pour inscription :', req.body);
    if (!nom || !prenom || !email || !motDePasse || !telephone || !adresse || !ville || !codePostal) {
      return res.status(400).json({ message: '⚠️ Tous les champs obligatoires doivent être remplis.' });
    }

    const [existingUser] = await db.query(
      'SELECT * FROM Utilisateur WHERE email = ?',
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({ message: '⚠️ Un utilisateur avec cet email existe déjà.' });
    }

    const insertQuery = `
      INSERT INTO Utilisateur (nom, prenom, email, mot_de_passe, telephone, adresse, adresse_complementaire, ville, code_postal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      nom,
      prenom,
      email,
      motDePasse,
      telephone,
      adresse,
      adresseComplementaire || null,
      ville,
      codePostal
    ];

    const [result] = await db.query(insertQuery, values);
    const userId = result.insertId;
    console.log(`✅ Utilisateur inséré avec ID: ${userId}`);
    
    try {
      const [tablesUserRole] = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'lambardn_mite' 
        AND table_name = 'UtilisateurRole'
      `);
      
      if (tablesUserRole.length > 0) {
        await db.query(
          'INSERT INTO UtilisateurRole (id_utilisateur, id_role) VALUES (?, ?)',
          [userId, 1]
        );
        console.log(`✅ Rôle Client attribué à l'utilisateur ${userId}`);
      } else {
        await db.query(
          'UPDATE Utilisateur SET id_role = ? WHERE id_utilisateur = ?',
          [1, userId]
        );
        console.log(`✅ Champ id_role mis à jour pour l'utilisateur ${userId}`);
      }
    } catch (roleError) {
      console.warn('⚠️ Erreur lors de l\'attribution du rôle:', roleError);
    }

    const emailResult = await envoyerEmailBienvenue(email, nom);
    
    if (emailResult.success) {
      console.log(`✅ Email envoyé avec succès lors de l'inscription de ${email}`);
      res.status(201).json({
        message: '🎉 Utilisateur enregistré avec succès. Un email de bienvenue a été envoyé.',
        userId: userId,
        emailSent: true,
        redirectUrl: '/login',
      });
    } else {
      console.warn(`⚠️ Inscription réussie mais échec de l'envoi d'email à ${email}: ${emailResult.error}`);
      res.status(201).json({
        message: '🎉 Utilisateur enregistré avec succès, mais l\'email de bienvenue n\'a pas pu être envoyé.',
        userId: userId,
        emailSent: false,
        redirectUrl: '/login',
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement :', error);
    res.status(500).json({ 
      message: '🚨 Erreur lors de l\'enregistrement.',
      error: process.env.NODE_ENV === 'development' ? error.message : error.message
    });
  }
};

const loginUser = async (req, res) => {
  const { email, motDePasse } = req.body;

  try {
    console.log('🔑 Tentative de connexion avec :', { email });

    const [rows] = await db.query(
      'SELECT * FROM Utilisateur WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    const utilisateur = rows[0];

    if (utilisateur.mot_de_passe !== motDePasse) {
      return res.status(401).json({ message: 'Mot de passe incorrect.' });
    }

    let roleNames = [];
    let isAdmin = false;

    try {
      const [tablesUserRole] = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'lambardn_mite' 
        AND table_name = 'UtilisateurRole'
      `);

      if (tablesUserRole.length > 0) {
        const [roles] = await db.query(`
          SELECT r.nom_role 
          FROM UtilisateurRole ur
          JOIN Role r ON ur.id_role = r.id_role
          WHERE ur.id_utilisateur = ?
        `, [utilisateur.id_utilisateur]);

        roleNames = roles.map(role => role.nom_role);
        isAdmin = roleNames.includes('Administrateur');
      } else {
        if (utilisateur.id_role) {
          const [role] = await db.query('SELECT nom_role FROM Role WHERE id_role = ?', [utilisateur.id_role]);
          if (role.length > 0) {
            roleNames = [role[0].nom_role];
            isAdmin = role[0].nom_role === 'Administrateur';
          } else {
            roleNames = ['Client']; 
          }
        } else {
          roleNames = ['Client']; 
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération des rôles:', error);
      roleNames = ['Client'];
      isAdmin = false;
    }

    const token = jwt.sign(
      {
        userId: utilisateur.id_utilisateur,
        email: utilisateur.email,
        roles: roleNames
      },
      JWT_SECRET,
      { expiresIn: '100y' } 
    );

    console.log(`👤 Utilisateur connecté: ${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email})`);
    console.log(`🔑 Rôles: ${roleNames.join(', ')}`);
    console.log(`🎟️ Token JWT généré`);
    
    res.status(200).json({
      message: 'Connexion réussie',
      token: token,
      utilisateur: {
        id: utilisateur.id_utilisateur,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        email: utilisateur.email,
        telephone: utilisateur.telephone
      },
      roles: roleNames.join(', '),
      isAdmin: isAdmin,
      redirectUrl: '/accueil',
    });

  } catch (error) {
    console.error('❌ Erreur lors de la connexion :', error);
    res.status(500).json({ message: 'Erreur serveur.', error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email requis.' });
    }

    const [rows] = await db.query(
      'SELECT email, telephone FROM Utilisateur WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du profil :', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

const getUserRoles = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'ID utilisateur requis.' });
    }

    let roleNames = [];

    try {
      const [tablesUserRole] = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'lambardn_mite' 
        AND table_name = 'UtilisateurRole'
      `);

      if (tablesUserRole.length > 0) {
        const [roles] = await db.query(`
          SELECT r.nom_role 
          FROM UtilisateurRole ur
          JOIN Role r ON ur.id_role = r.id_role
          WHERE ur.id_utilisateur = ?
        `, [userId]);

        roleNames = roles.map(role => role.nom_role);
      } else {
        const [user] = await db.query('SELECT id_role FROM Utilisateur WHERE id_utilisateur = ?', [userId]);
        
        if (user.length > 0 && user[0].id_role) {
          const [role] = await db.query('SELECT nom_role FROM Role WHERE id_role = ?', [user[0].id_role]);
          if (role.length > 0) {
            roleNames = [role[0].nom_role];
          } else {
            roleNames = ['Client']; 
          }
        } else {
          roleNames = ['Client']; 
        }
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération des rôles:', error);
      roleNames = ['Client']; 
    }
    
    res.status(200).json({
      userId: userId,
      roles: roleNames.join(', ')
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des rôles :', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la récupération des rôles.',
      error: error.message 
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'ID utilisateur requis.' });
    }
    
    console.log(`🔄 Mise à jour du profil utilisateur: ${userId}`);
    console.log('Données reçues:', req.body);
    
    const updateData = {};
    
    if (req.body.firstName) updateData.prenom = req.body.firstName;
    if (req.body.lastName) updateData.nom = req.body.lastName;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.telephone) updateData.telephone = req.body.telephone;
    if (req.body.address) updateData.adresse = req.body.address;
    
    if (Object.keys(updateData).length === 0 && !req.file) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour.' });
    }
    
    if (req.file) {
      console.log('Image reçue:', req.file);
      const profileImagePath = `/uploads/profiles/${req.file.filename}`;
      updateData.profile_image = profileImagePath;
      
      console.log('Chemin de l\'image enregistré:', profileImagePath);
    }
    
    const [existingUser] = await db.query(
      'SELECT * FROM Utilisateur WHERE id_utilisateur = ?',
      [userId]
    );
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    
    const updateFields = Object.keys(updateData).map(field => `${field} = ?`).join(', ');
    const updateValues = Object.values(updateData);
    
    if (updateFields.length > 0) {
      updateValues.push(userId);
      
      await db.query(
        `UPDATE Utilisateur SET ${updateFields} WHERE id_utilisateur = ?`,
        updateValues
      );
      
      console.log(`✅ Profil utilisateur mis à jour avec succès`);
    }
    
    const [updatedUser] = await db.query(
      'SELECT id_utilisateur, nom, prenom, email, telephone, adresse, profile_image FROM Utilisateur WHERE id_utilisateur = ?',
      [userId]
    );
    
    res.status(200).json({
      message: 'Profil mis à jour avec succès.',
      user: {
        id: updatedUser[0].id_utilisateur,
        firstName: updatedUser[0].prenom,
        lastName: updatedUser[0].nom,
        email: updatedUser[0].email,
        telephone: updatedUser[0].telephone,
        address: updatedUser[0].adresse,
        profileImage: updatedUser[0].profile_image ? 
          `${req.protocol}://${req.get('host')}${updatedUser[0].profile_image}` : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du profil :', error);
    res.status(500).json({ 
      message: 'Erreur serveur lors de la mise à jour du profil.',
      error: error.message 
    });
  }
};

module.exports = { registerUser, loginUser, getUserProfile, testEmail, getUserRoles, updateUserProfile };