// AI-powered story point estimator based on user performance patterns
// Uses Git commits (GitHub/Bitbucket) and Linear issue data to suggest Fibonacci estimates

const FIBONACCI_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34];

class StoryPointEstimator {
  constructor(linearData, gitData, userPerformance) {
    this.linearData = linearData;
    this.gitData = gitData;
    this.userPerformance = userPerformance;
    this.personalVelocity = this.calculatePersonalVelocity();
  }

  // Calculate user's personal velocity from historical data
  calculatePersonalVelocity() {
    const completedIssues = this.linearData.issues?.filter(issue => 
      issue.state?.type === 'completed' && 
      issue.assignee?.id === this.userPerformance.userId &&
      issue.estimate > 0
    ) || [];

    if (completedIssues.length === 0) {
      return {
        avgPointsPerDay: 2,
        avgTimePerPoint: 1,
        complexity: 'medium',
        accuracy: 0.5
      };
    }

    const totalPoints = completedIssues.reduce((sum, issue) => sum + issue.estimate, 0);
    const avgCompletionTime = completedIssues.reduce((sum, issue) => {
      const created = new Date(issue.createdAt);
      const completed = new Date(issue.completedAt);
      return sum + (completed - created) / (1000 * 60 * 60 * 24); // days
    }, 0) / completedIssues.length;

    return {
      avgPointsPerDay: totalPoints / (avgCompletionTime * completedIssues.length) || 2,
      avgTimePerPoint: avgCompletionTime / (totalPoints / completedIssues.length) || 1,
      complexity: this.determineComplexityPreference(completedIssues),
      accuracy: this.calculateEstimateAccuracy(completedIssues)
    };
  }

  // Determine user's complexity preference from past work
  determineComplexityPreference(issues) {
    const avgPoints = issues.reduce((sum, issue) => sum + issue.estimate, 0) / issues.length;
    if (avgPoints <= 3) return 'simple';
    if (avgPoints <= 8) return 'medium';
    return 'complex';
  }

  // Calculate how accurate user's estimates typically are
  calculateEstimateAccuracy(issues) {
    // This would ideally compare estimated vs actual time
    // For now, use a heuristic based on completion consistency
    const completionTimes = issues.map(issue => {
      const created = new Date(issue.createdAt);
      const completed = new Date(issue.completedAt);
      return (completed - created) / (1000 * 60 * 60 * 24);
    });

    const avgTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    const variance = completionTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / completionTimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower variance indicates better estimation accuracy
    return Math.max(0.1, 1 - (standardDeviation / avgTime));
  }

  // Estimate story points for a Linear issue
  estimateStoryPoints(issue) {
    const analysis = this.analyzeIssueComplexity(issue);
    const baseEstimate = this.calculateBaseEstimate(analysis);
    const adjustedEstimate = this.adjustForPersonalVelocity(baseEstimate, analysis);
    const fibonacciEstimate = this.roundToFibonacci(adjustedEstimate);

    return {
      suggestedPoints: fibonacciEstimate,
      confidence: this.calculateConfidence(analysis),
      reasoning: this.generateReasoning(analysis, baseEstimate, fibonacciEstimate),
      alternatives: this.generateAlternatives(fibonacciEstimate),
      timeEstimate: this.estimateTimeRequired(fibonacciEstimate)
    };
  }

  // Analyze issue complexity based on title, description, labels
  analyzeIssueComplexity(issue) {
    const complexity = {
      textComplexity: this.analyzeTextComplexity(issue.title, issue.description),
      labelComplexity: this.analyzeLabelComplexity(issue.labels),
      priorityWeight: this.analyzePriority(issue.priority),
      teamComplexity: this.analyzeTeamContext(issue.team),
      similarIssues: this.findSimilarIssues(issue)
    };

    return complexity;
  }

  // Analyze text complexity from title and description
  analyzeTextComplexity(title, description) {
    const combinedText = `${title} ${description || ''}`.toLowerCase();
    let score = 1;

    // Technical keywords increase complexity
    const technicalKeywords = [
      'refactor', 'architecture', 'database', 'migration', 'integration',
      'api', 'security', 'performance', 'optimization', 'algorithm',
      'deploy', 'infrastructure', 'testing', 'automation'
    ];

    const simpleKeywords = [
      'fix', 'update', 'change', 'add', 'remove', 'typo', 'text',
      'button', 'color', 'style', 'copy', 'documentation'
    ];

    const complexKeywords = [
      'implement', 'build', 'create', 'design', 'develop',
      'complex', 'multiple', 'system', 'workflow', 'process'
    ];

    technicalKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) score += 0.5;
    });

    simpleKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) score -= 0.2;
    });

    complexKeywords.forEach(keyword => {
      if (combinedText.includes(keyword)) score += 0.3;
    });

    // Length indicates complexity
    const wordCount = combinedText.split(' ').length;
    if (wordCount > 50) score += 0.5;
    if (wordCount > 100) score += 0.5;

    return Math.max(0.5, Math.min(3, score));
  }

  // Analyze label-based complexity
  analyzeLabelComplexity(labels) {
    if (!labels?.edges) return 1;

    let score = 1;
    const labelNames = labels.edges.map(edge => edge.node.name.toLowerCase());

    const complexLabels = ['epic', 'feature', 'architecture', 'breaking-change', 'research'];
    const simpleLabels = ['bug', 'hotfix', 'documentation', 'ui', 'copy'];

    labelNames.forEach(label => {
      if (complexLabels.some(complex => label.includes(complex))) score += 0.5;
      if (simpleLabels.some(simple => label.includes(simple))) score -= 0.2;
    });

    return Math.max(0.5, Math.min(2, score));
  }

  // Analyze priority impact
  analyzePriority(priority) {
    const priorityWeights = {
      1: 1.5, // Urgent
      2: 1.2, // High  
      3: 1.0, // Medium
      4: 0.8  // Low
    };
    return priorityWeights[priority] || 1.0;
  }

  // Analyze team context
  analyzeTeamContext() {
    // Different teams might have different complexity patterns
    // This would be enhanced with team-specific data
    return 1.0;
  }

  // Find similar completed issues for reference
  findSimilarIssues(issue) {
    const completedIssues = this.linearData.issues?.filter(i => 
      i.state?.type === 'completed' && 
      i.estimate > 0 &&
      i.id !== issue.id
    ) || [];

    const similar = completedIssues.filter(completedIssue => {
      const titleSimilarity = this.calculateTextSimilarity(issue.title, completedIssue.title);
      const teamMatch = issue.team?.id === completedIssue.team?.id;
      
      return titleSimilarity > 0.3 || teamMatch;
    });

    return similar.slice(0, 5); // Top 5 similar issues
  }

  // Calculate text similarity (simple implementation)
  calculateTextSimilarity(text1, text2) {
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  // Calculate base estimate before personal adjustments
  calculateBaseEstimate(analysis) {
    let baseScore = 2; // Start with 2 points

    // Apply complexity factors
    baseScore *= analysis.textComplexity;
    baseScore *= analysis.labelComplexity;
    baseScore *= analysis.priorityWeight;

    // Adjust based on similar issues
    if (analysis.similarIssues.length > 0) {
      const avgSimilarPoints = analysis.similarIssues.reduce((sum, issue) => sum + issue.estimate, 0) / analysis.similarIssues.length;
      baseScore = (baseScore + avgSimilarPoints) / 2; // Average with similar issues
    }

    return Math.max(1, baseScore);
  }

  // Adjust estimate based on personal velocity and preferences
  adjustForPersonalVelocity(baseEstimate) {
    let adjusted = baseEstimate;

    // Adjust based on complexity preference
    if (this.personalVelocity.complexity === 'simple' && baseEstimate > 5) {
      adjusted *= 1.2; // Takes longer on complex tasks
    } else if (this.personalVelocity.complexity === 'complex' && baseEstimate < 3) {
      adjusted *= 0.8; // Faster on simple tasks
    }

    // Adjust based on accuracy history
    if (this.personalVelocity.accuracy < 0.5) {
      adjusted *= 1.1; // Add buffer for low accuracy
    }

    return adjusted;
  }

  // Round to nearest Fibonacci number
  roundToFibonacci(estimate) {
    const closest = FIBONACCI_SEQUENCE.reduce((prev, curr) => 
      Math.abs(curr - estimate) < Math.abs(prev - estimate) ? curr : prev
    );
    return closest;
  }

  // Calculate confidence in the estimate
  calculateConfidence(analysis) {
    let confidence = 0.5;

    // More similar issues = higher confidence
    if (analysis.similarIssues.length > 2) confidence += 0.2;
    
    // Personal accuracy affects confidence  
    confidence += this.personalVelocity.accuracy * 0.3;

    // Clear text description = higher confidence
    if (analysis.textComplexity > 0.8 && analysis.textComplexity < 2) confidence += 0.1;

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  // Generate human-readable reasoning  
  generateReasoning(analysis) {
    const reasons = [];

    if (analysis.textComplexity > 1.5) {
      reasons.push("High technical complexity detected in description");
    } else if (analysis.textComplexity < 0.8) {
      reasons.push("Simple task based on description");
    }

    if (analysis.similarIssues.length > 0) {
      const avgSimilar = analysis.similarIssues.reduce((sum, issue) => sum + issue.estimate, 0) / analysis.similarIssues.length;
      reasons.push(`Similar issues averaged ${avgSimilar.toFixed(1)} points`);
    }

    if (analysis.priorityWeight > 1.1) {
      reasons.push("High priority may require extra care and testing");
    }

    if (this.personalVelocity.complexity !== 'medium') {
      reasons.push(`Adjusted for your ${this.personalVelocity.complexity} task preference`);
    }

    return reasons;
  }

  // Generate alternative estimates
  generateAlternatives(mainEstimate) {
    const index = FIBONACCI_SEQUENCE.indexOf(mainEstimate);
    const alternatives = [];

    if (index > 0) {
      alternatives.push({
        points: FIBONACCI_SEQUENCE[index - 1],
        reason: "If scope is smaller than expected"
      });
    }

    if (index < FIBONACCI_SEQUENCE.length - 1) {
      alternatives.push({
        points: FIBONACCI_SEQUENCE[index + 1],
        reason: "If additional complexity emerges"
      });
    }

    return alternatives;
  }

  // Estimate time required based on personal velocity
  estimateTimeRequired(points) {
    const daysEstimate = points * this.personalVelocity.avgTimePerPoint;
    const hours = daysEstimate * 8; // 8 hours per day

    return {
      days: Math.round(daysEstimate * 10) / 10,
      hours: Math.round(hours * 10) / 10,
      range: {
        min: Math.round(hours * 0.7 * 10) / 10,
        max: Math.round(hours * 1.3 * 10) / 10
      }
    };
  }

  // Batch estimate multiple issues
  estimateMultipleIssues(issues) {
    return issues.map(issue => ({
      issue,
      estimate: this.estimateStoryPoints(issue)
    }));
  }

  // Get prioritization recommendations
  getPrioritizationRecommendations(issues) {
    const estimates = this.estimateMultipleIssues(issues);
    
    // Sort by value/effort ratio (priority/points)
    const prioritized = estimates.map(item => ({
      ...item,
      valueEffortRatio: (item.issue.priority || 3) / item.estimate.suggestedPoints,
      quickWin: item.estimate.suggestedPoints <= 3 && (item.issue.priority || 3) >= 2
    })).sort((a, b) => b.valueEffortRatio - a.valueEffortRatio);

    return {
      recommended: prioritized.slice(0, 5),
      quickWins: prioritized.filter(item => item.quickWin).slice(0, 3),
      totalEffort: estimates.reduce((sum, item) => sum + item.estimate.suggestedPoints, 0)
    };
  }
}

export default StoryPointEstimator;