import { enhancedBrain } from './core/brain.js';
import { researchEngine } from './core/researcher.js';
import { projectPlanner } from './core/planner.js';

async function demonstrateTitan() {
  console.log('🚀 Demonstrating Titan\'s Autonomous Capabilities\n');

  try {
    // 1. Create an autonomous project
    console.log('1️⃣ Creating Autonomous Project...');
    const project = await enhancedBrain.createAutonomousProject(
      'Lead Generation System',
      'Build an automated system that finds and qualifies leads for a SaaS company',
      [
        'Generate 100 qualified leads per month',
        'Achieve 5% conversion rate', 
        'Automate the entire lead qualification process'
      ]
    );
    console.log('✅ Project Created:', project.title);
    console.log('   Status:', project.status);
    console.log('   Progress:', project.progress + '%');
    console.log('   Current Phase:', project.currentPhase);
    console.log('');

    // 2. Conduct research
    console.log('2️⃣ Conducting Market Research...');
    const researchTask = await researchEngine.createResearchTask(
      'Lead Generation Software Market',
      'comprehensive',
      [
        'What are the current market trends?',
        'Who are the key competitors?',
        'What technologies are most effective?',
        'What are the pricing models?'
      ]
    );
    console.log('✅ Research Task Created:', researchTask.topic);
    console.log('   Questions:', researchTask.questions.length);
    console.log('');

    // 3. Create a detailed project plan
    console.log('3️⃣ Creating Detailed Project Plan...');
    const plan = await projectPlanner.createProjectPlan(
      project.id,
      'Lead Generation System Implementation',
      'Build a comprehensive lead generation system with automation',
      [
        'Research market and competitors',
        'Design system architecture',
        'Build core components',
        'Test and optimize',
        'Deploy and monitor'
      ]
    );
    console.log('✅ Project Plan Created');
    console.log('   Tasks:', plan.tasks.length);
    console.log('   Timeline:', plan.timeline.startDate.toDateString(), 'to', plan.timeline.endDate.toDateString());
    console.log('   Resources:', plan.resources.personas.join(', '));
    console.log('   Risks Identified:', plan.risks.length);
    console.log('');

    // 4. Show project progress
    console.log('4️⃣ Project Progress Analysis...');
    const progress = await projectPlanner.getProjectProgress(project.id);
    console.log('✅ Progress Report');
    console.log('   Completed:', progress.completed, '/', progress.total, 'tasks');
    console.log('   Percentage:', progress.percentage.toFixed(1) + '%');
    console.log('   Hours Remaining:', progress.estimatedHoursRemaining);
    console.log('');

    console.log('🎯 Titan Successfully Demonstrated!');
    console.log('   - Autonomous project creation ✅');
    console.log('   - Market research capabilities ✅');
    console.log('   - Detailed planning and analysis ✅');
    console.log('   - Progress tracking and optimization ✅');
    console.log('');
    console.log('This is a real autonomous system that can:');
    console.log('   • Plan complex projects from scratch');
    console.log('   • Research markets and technologies');
    console.log('   • Coordinate multiple personas');
    console.log('   • Learn from failures and optimize');
    console.log('   • Execute multi-step tasks autonomously');

  } catch (error) {
    console.error('❌ Error demonstrating Titan:', error.message);
  }
}

demonstrateTitan(); 