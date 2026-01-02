class HiringIntentClassifier {
  constructor() {
    this.minScore = 50;
    
    // ===== INSTANT REJECT =====
    
    // Engagement farming (HARD BLOCK)
    this.farmingPhrases = [
      'rt to enter', 'rt to win', 'rt and follow', 'rt & follow',
      'retweet to enter', 'retweet to win', 'retweet and follow',
      'like and rt', 'like and retweet', 'like & rt',
      'tag 3 friends', 'tag your friends', 'tag someone',
      'follow and rt', 'follow and retweet', 'must follow',
      'drop your wallet', 'comment your wallet'
    ];
    
    // Job seeker posts (HARD BLOCK)
    this.jobSeekerPhrases = [
      "i'm looking for", "i am looking for", "i need a job",
      "hire me", "consider me", "i'm jobless", "i am jobless",
      "anyone hiring", "does anyone", "help me find",
      "i'm open to", "available for hire", "seeking employment"
    ];
    
    // Just talking ABOUT something (NOT hiring)
    this.justTalkingAbout = [
      'i wanted to', 'i want to be', 'wanted to be', 'i wish',
      'thinking about', 'dreaming of', 'aspiring',
      'recap:', 'my year', 'my 2025', 'looking back',
      'thank you', 'thanks to', 'shoutout to',
      'congratulations', 'congrats', 'proud of',
      'just got', 'just became', 'new role as',
      'happy to announce', "i'm excited", "i'm proud"
    ];
    
    // Scam/spam (HARD BLOCK)
    this.scamIndicators = [
      '100x', 'moon', 'lambo', 'get rich', 'easy money',
      'financial freedom', 'passive income', 'guaranteed'
    ];
    
    // Technical roles (HARD BLOCK)
    this.technicalRoles = [
      'solidity developer', 'rust developer', 'smart contract developer',
      'blockchain engineer', 'frontend developer', 'backend developer',
      'full stack developer', 'software engineer'
    ];
    
    // ===== MUST HAVE (Required for ANY score) =====
    
    // EXPLICIT hiring language (REQUIRED)
    this.explicitHiring = [
      "we're hiring", "we are hiring", "we're looking for",
      "we are looking for", "join our team", "join us",
      "now hiring", "hiring a", "hiring an", "hiring for",
      "seeking a", "seeking an", "looking to hire",
      "position open", "role available", "apply now",
      "apply here", "applications open", "recruiting",
      "come work with", "work with us"
    ];
    
    // Company indicators (bonus points)
    this.companyIndicators = [
      'our team', 'our company', 'we need', 'our project',
      'our platform', 'our community'
    ];
    
    // ===== HOTCAKE INDICATORS (70+ score) =====
    
    // Payment mentioned
    this.paymentIndicators = [
      '$', 'usd', 'usdt', 'salary', 'paid', 'compensation',
      'pay', 'reward', 'token', 'monthly', 'weekly'
    ];
    
    // Application forms (HIGH QUALITY)
    this.applicationForms = [
      'forms.gle', 'typeform', 'airtable', 'notion.so',
      'google.com/forms', 'apply here', 'application form',
      'fill out', 'submit application'
    ];
    
    // Clear role with action
    this.clearRoles = [
      'hiring ambassador', 'hiring kol', 'hiring community manager',
      'hiring moderator', 'hiring content creator',
      'seeking ambassador', 'seeking kol', 'seeking community manager'
    ];
  }
  
  /**
   * ULTRA STRICT classification
   */
  classify(tweet) {
    const text = tweet.text.toLowerCase();
    const originalText = tweet.text;
    
    // ===== PHASE 1: INSTANT REJECTIONS =====
    
    // 1. Farming
    if (this.farmingPhrases.some(p => text.includes(p))) {
      return { score: 0, reasons: ['REJECTED: Farming'], breakdown: {} };
    }
    
    // 2. Job seeker
    if (this.jobSeekerPhrases.some(p => text.includes(p))) {
      return { score: 0, reasons: ['REJECTED: Job seeker'], breakdown: {} };
    }
    
    // 3. Just talking about (NOT hiring)
    if (this.justTalkingAbout.some(p => text.includes(p))) {
      return { score: 0, reasons: ['REJECTED: Just talking about, not hiring'], breakdown: {} };
    }
    
    // 4. Scam/spam
    if (this.scamIndicators.some(p => text.includes(p))) {
      return { score: 0, reasons: ['REJECTED: Scam'], breakdown: {} };
    }
    
    // 5. Technical role
    if (this.technicalRoles.some(p => text.includes(p))) {
      return { score: 0, reasons: ['REJECTED: Technical role'], breakdown: {} };
    }
    
    // 6. Too many emojis
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 15) {
      return { score: 0, reasons: ['REJECTED: Excessive emojis'], breakdown: {} };
    }
    
    // 7. Just announcing THEIR new role (not hiring)
    if (text.includes('officially') || text.includes('new brand ambassador') || 
        text.includes('proud to announce') || text.includes('excited to announce')) {
      if (!text.includes('hiring') && !text.includes('looking for') && !text.includes('seeking')) {
        return { score: 0, reasons: ['REJECTED: Personal announcement, not hiring'], breakdown: {} };
      }
    }
    
    // ===== PHASE 2: MUST HAVE EXPLICIT HIRING LANGUAGE =====
    
    const hasExplicitHiring = this.explicitHiring.some(p => text.includes(p));
    
    if (!hasExplicitHiring) {
      // Exception: Has "hiring" + clear role
      const hasHiring = text.includes('hiring') || text.includes('recruiting');
      const hasClearRole = this.clearRoles.some(r => text.includes(r));
      
      if (!hasHiring || !hasClearRole) {
        return { score: 0, reasons: ['REJECTED: No explicit hiring language'], breakdown: {} };
      }
    }
    
    // ===== PHASE 3: MUST HAVE APPLICATION METHOD =====
    
    const hasLink = tweet.links && tweet.links.length > 0;
    const hasDM = text.includes('dm me') || text.includes('dm us') || 
                  text.includes('message me') || text.includes('message us');
    const hasEmail = text.includes('email') || text.includes('@');
    const hasApply = text.includes('apply') || text.includes('application');
    
    if (!hasLink && !hasDM && !hasEmail && !hasApply) {
      return { score: 0, reasons: ['REJECTED: No application method'], breakdown: {} };
    }
    
    // ===== PHASE 4: SCORING (Only for tweets that passed all checks) =====
    
    let score = 50; // Base score for passing all filters
    let reasons = ['✓ Passed strict filters'];
    
    // Company voice (+10)
    if (this.companyIndicators.some(p => text.includes(p))) {
      score += 10;
      reasons.push('✓ Company voice (+10)');
    }
    
    // Has link (+10)
    if (hasLink) {
      score += 10;
      reasons.push('✓ Has link (+10)');
      
      // Application form link (+10 bonus)
      if (this.applicationForms.some(form => originalText.includes(form))) {
        score += 10;
        reasons.push('✓ Application form link (+10 BONUS)');
      }
    }
    
    // Payment mentioned (+15)
    if (this.paymentIndicators.some(p => text.includes(p) || originalText.includes(p))) {
      score += 15;
      reasons.push('✓ Payment mentioned (+15)');
    }
    
    // Clear role (+10)
    if (this.clearRoles.some(r => text.includes(r))) {
      score += 10;
      reasons.push('✓ Clear hiring + role (+10)');
    }
    
    // Verified account (+5)
    const author = tweet.author || {};
    if (author.verified) {
      score += 5;
      reasons.push('✓ Verified (+5)');
    }
    
    // Good engagement (+5)
    const engagement = tweet.engagement || {};
    const totalEng = (engagement.likes || 0) + (engagement.retweets || 0);
    if (totalEng >= 3 && totalEng <= 200) {
      score += 5;
      reasons.push('✓ Good engagement (+5)');
    }
    
    // Final score
    score = Math.max(50, Math.min(100, score));
    
    return {
      score: Math.round(score),
      reasons,
      breakdown: {
        hasExplicitHiring,
        hasLink,
        hasPayment: this.paymentIndicators.some(p => text.includes(p)),
        hasApplicationForm: this.applicationForms.some(f => originalText.includes(f))
      }
    };
  }
  
  /**
   * Quick validation
   */
  isValidJob(tweet) {
    const text = tweet.text.toLowerCase();
    
    // Hard blocks
    if (this.farmingPhrases.some(p => text.includes(p))) return false;
    if (this.jobSeekerPhrases.some(p => text.includes(p))) return false;
    if (this.justTalkingAbout.some(p => text.includes(p))) return false;
    if (this.scamIndicators.some(p => text.includes(p))) return false;
    
    // Must have explicit hiring
    if (!this.explicitHiring.some(p => text.includes(p))) {
      const hasHiring = text.includes('hiring') || text.includes('recruiting');
      if (!hasHiring) return false;
    }
    
    return true;
  }
}

module.exports = HiringIntentClassifier;