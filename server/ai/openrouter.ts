import { OpenRouter } from '../../services/openrouter';

const openRouter = new OpenRouter();

export interface TaskSuggestion {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export async function generateInitialTasks(prompt: string): Promise<TaskSuggestion[]> {
  try {
    console.log('🤖 Generating initial tasks for prompt:', prompt.substring(0, 100) + '...');

    const aiResponse = await openRouter.chat({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a project planning AI. Given a project goal, generate 3-5 concrete tasks required to accomplish it. 

Respond with ONLY valid JSON in this exact format:
[
  {
    "title": "Task title",
    "description": "Optional task description",
    "status": "pending"
  }
]

Guidelines:
- Make tasks specific and actionable
- Include technical implementation details
- Ensure tasks are logically ordered
- Keep descriptions concise but informative
- Always set status to "pending" for new tasks`
        },
        {
          role: 'user',
          content: `Given the following project goal: "${prompt}", return 3-5 concrete tasks required to accomplish it.`
        }
      ],
      max_tokens: 1000
    });

    const responseContent = aiResponse.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from AI');
    }

    let taskSuggestions: TaskSuggestion[];
    try {
      taskSuggestions = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response as JSON:', responseContent);
      throw new Error('AI response was not valid JSON');
    }

    // Validate and normalize task suggestions
    const validatedTasks = taskSuggestions
      .filter((task: any) => task && task.title)
      .map((task: any) => ({
        title: task.title,
        description: task.description || '',
        status: 'pending' as const
      }))
      .slice(0, 5); // Limit to 5 tasks max

    console.log(`✅ Generated ${validatedTasks.length} tasks`);
    return validatedTasks;

  } catch (error) {
    console.error('❌ Error generating initial tasks:', error);
    return []; // Fallback to empty task list
  }
} 