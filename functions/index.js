const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();
sgMail.setApiKey(process.env.ADMIN_SENDGRID_KEY);

// Run every 5 minutes
exports.checkUpcomingGames = onSchedule({
  schedule: "*/5 * * * *",
  memory: "256MiB",
}, async (event) => {
  try {
    const rounds = ['round1', 'round2', 'round3', 'nfl'];
    const upcomingGames = [];

    // Collect all games starting in ~30 minutes
    for (const round of rounds) {
      const gamesDoc = await admin.firestore().doc(`games/${round}`).get();
      if (gamesDoc.exists) {
        const games = gamesDoc.data().games || [];
        games.forEach(game => {
          console.log(`Checking game: ${game.homeTeam} vs ${game.awayTeam}`);
          console.log(`Game time (stored): ${game.startTime}`);
          
          const gameTime = new Date(game.startTime);
          // Convert current time to CST for comparison
          const now = new Date();
          // Format the current time in CST
          const cstNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
          const thirtyMinutesFromNow = new Date(cstNow.getTime() + 30 * 60 * 1000);
          const twentyFiveMinutesFromNow = new Date(cstNow.getTime() + 15 * 60 * 1000);
          
          // Detailed time logging
          console.log({
            currentTime: cstNow.toLocaleString('en-US', { timeZone: 'America/Chicago' }),
            gameTime: gameTime.toLocaleString('en-US', { timeZone: 'America/Chicago' }),
            windowStart: twentyFiveMinutesFromNow.toLocaleString('en-US', { timeZone: 'America/Chicago' }),
            windowEnd: thirtyMinutesFromNow.toLocaleString('en-US', { timeZone: 'America/Chicago' })
          });
          
          // Check if game starts between 25-30 minutes from now
          if (gameTime > twentyFiveMinutesFromNow && gameTime < thirtyMinutesFromNow) {
            console.log(`Found upcoming game: ${game.homeTeam} vs ${game.awayTeam}`);
            upcomingGames.push({
              ...game,
              round
            });
          }
        });
      }
    }

    if (upcomingGames.length === 0) {
      console.log('No upcoming games found');
      return;
    }

    // Get all users
    const usersSnapshot = await admin.firestore().collection('users').get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Check each user's picks for upcoming games
    const emailPromises = [];
    users.forEach(user => {
      if (!user.email) {
        console.log(`Skipping user ${user.id} - no email found`);
        return;
      }

      const userMissingGames = upcomingGames.filter(game => {
        if (game.round === 'nfl') {
          const hasPick = user.picks?.[game.round]?.[game.id]?.team && 
                         user.picks?.[game.round]?.[game.id]?.points;
          console.log(`Checking NFL game ${game.id} for user ${user.email}: ${hasPick ? 'has pick' : 'missing pick'}`);
          return !hasPick;
        }
        const hasPick = !!user.picks?.[game.round]?.[game.id];
        console.log(`Checking game ${game.id} for user ${user.email}: ${hasPick ? 'has pick' : 'missing pick'}`);
        return !hasPick;
      });

      if (userMissingGames.length > 0) {
        console.log(`User ${user.email} missing picks for ${userMissingGames.length} games`);
        
        const msg = {
          to: user.email,
          from: process.env.ADMIN_SENDGRID_FROM, // Make sure this matches your verified sender
          subject: '⚠️ Reminder: Games Starting Soon!',
          html: `
            <h2>Reminder: Make Your Picks!</h2>
            <p>You have ${userMissingGames.length} game${userMissingGames.length > 1 ? 's' : ''} starting in about 30 minutes that you haven't picked yet:</p>
            ${userMissingGames.map(game => `
              <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <p><strong>${game.homeTeam} vs ${game.awayTeam}</strong></p>
                <p>Game starts at: ${new Date(game.startTime).toLocaleString('en-US', { 
                  timeZone: 'America/Chicago',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZoneName: 'short'
                })}</p>
                ${game.round === 'nfl' ? '<p>Remember to set your confidence points!</p>' : ''}
              </div>
            `).join('')}
            <p><a href="https://picks-league-a6695.web.app/">Click here to make your picks!</a></p>
          `
        };
        
        emailPromises.push(
          sgMail.send(msg)
            .then(() => console.log(`Successfully sent email to ${user.email}`))
            .catch(error => console.error(`Error sending email to ${user.email}:`, error))
        );
      }
    });

    if (emailPromises.length > 0) {
      await Promise.all(emailPromises);
      console.log(`Sent ${emailPromises.length} reminder emails`);
    }
  } catch (error) {
    console.error('Error in checkUpcomingGames:', error);
    throw error;
  }
});