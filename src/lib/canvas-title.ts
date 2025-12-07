import { supabase } from '@/lib/supabase';
import { xai } from '@/lib/xai';

/**
 * Generates a short, descriptive title from a user prompt using xAI.
 */
export async function generateTitleFromPrompt(prompt: string): Promise<string> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) return 'Untitled Canvas';

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-beta', // Use a reliable fast model
      messages: [
        {
          role: 'system',
          content: `Generate a 3-6 word concise title for this content. No quotes. No markdown.`
        },
        {
          role: 'user',
          content: cleanPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    let title = response.choices[0]?.message?.content?.trim();

    // Cleanup - aggressively strip markdown
    if (title) {
      // Remove all lines that are just headers, keep content
      title = title.split('\n').map(line => line.replace(/^#+\s*/, '')).join(' ');
      title = title.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
      title = title.replace(/#{1,6}\s*/g, ''); // Remove ALL markdown headers anywhere
      title = title.replace(/\*\*/g, ''); // Remove bold markdown
      title = title.replace(/\*|_/g, ''); // Remove italic markdown
      title = title.replace(/`/g, ''); // Remove code backticks
      title = title.replace(/\.$/, ''); // Remove trailing dot
      title = title.replace(/\s+/g, ' '); // Collapse whitespace
      title = title.trim();
    }

    // If the model gave us nothing useful or something effectively like
    // "Untitled Canvas", fall back to a title derived from the prompt itself
    const looksUntitled =
      !title || /^untitled\s+canvas$/i.test(title) || /^untitled$/i.test(title);

    if (looksUntitled) {
      // Simple prompt‑based fallback: collapse whitespace and trim length.
      const fromPrompt = cleanPrompt.replace(/\s+/g, ' ').substring(0, 80);
      return fromPrompt || 'Untitled Canvas';
    }

    if (!title) return 'Untitled Canvas';

    return title.substring(0, 100); // Hard limit
  } catch (error) {
    console.error('Title generation failed:', error);
    return 'Untitled Canvas';
  }
}

interface AutoTitleResult {
  updated: boolean;
  title?: string;
  reason?: string;
}

/**
 * Checks if a canvas needs a title and updates it if so.
 *
 * This is intentionally tolerant of older databases that don't yet have
 * the `auto_title_generated` column – in that case we fall back to using
 * the name alone to determine whether we've already auto‑titled.
 */
export async function maybeAutoTitleCanvas({
  canvasId,
  userId,
  prompt,
}: {
  canvasId: string;
  userId: string;
  prompt: string;
}): Promise<AutoTitleResult> {
  if (!canvasId || !prompt || !prompt.trim()) {
    return { updated: false, reason: 'Missing canvasId or prompt' };
  }

  try {
    // 1. Fetch canvas and ownership
    const { data: canvas, error } = await supabase
      .from('canvases')
      .select('name, user_id')
      .eq('id', canvasId)
      .single();

    if (error || !canvas) {
      console.error('Auto-title: Canvas lookup failed', error);
      return { updated: false, reason: 'Canvas not found' };
    }

    // 1b. Permission: owner or edit/public-edit share
    const isOwner = canvas.user_id === userId;
    if (!isOwner) {
      const { data: share } = await supabase
        .from('canvas_shares')
        .select('permission, is_public')
        .eq('canvas_id', canvasId)
        .maybeSingle();
      const canEdit = share?.permission === 'edit' || share?.is_public === true;
      if (!canEdit) {
        return { updated: false, reason: 'Not authorized' };
      }
    }

    // 2. Skip if already titled manually.
    // We treat "Untitled Canvas" (or an empty name) as untitled.
    const isUntitled = !canvas.name || canvas.name === 'Untitled Canvas';
    if (!isUntitled) {
      return { updated: false, reason: 'Manually titled' };
    }

    // 3. Generate Title
    const newTitle = await generateTitleFromPrompt(prompt);

    if (newTitle === 'Untitled Canvas' || !newTitle) {
      return { updated: false, reason: 'Model returned generic title' };
    }

    // 4. Update DB
    // First, try to set both the name and the auto_title_generated flag.
    // If the column doesn't exist yet, fall back to updating just the name.
    let updateError: any = null;

    const { error: firstUpdateError } = await supabase
      .from('canvases')
      .update({
        name: newTitle,
        // This will fail gracefully if the column doesn't exist.
        auto_title_generated: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', canvasId);

    if (firstUpdateError) {
      const message = String(firstUpdateError.message || '');
      const looksLikeMissingColumn =
        message.includes('auto_title_generated') ||
        (message.includes('column') && message.includes('does not exist'));

      if (looksLikeMissingColumn) {
        // Retry without the flag – works on older schemas.
        const { error: secondUpdateError } = await supabase
          .from('canvases')
          .update({
            name: newTitle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', canvasId);

        updateError = secondUpdateError;
      } else {
        updateError = firstUpdateError;
      }
    }

    if (updateError) {
      console.error('Auto-title: Update failed', updateError);
      return { updated: false, reason: 'Update failed' };
    }

    return { updated: true, title: newTitle };
  } catch (e) {
    console.error('Auto-title exception:', e);
    return { updated: false, reason: 'Exception' };
  }
}

