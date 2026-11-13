import { authorize } from '../_shared/authorize.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ToonlyAI, a friendly and helpful AI assistant for ToonlyReels - a kid-friendly short-form video platform for animated content. 

Your personality:
- Cheerful, encouraging, and supportive
- Use simple, age-appropriate language
- Add occasional emojis to keep things fun 🎬✨
- Keep responses concise and helpful

You can help users with:
1. **App Features**: Explain how to use ToonlyReels (uploading videos, following creators, liking content, saving videos, etc.)
2. **Profile Help**: Guide users on editing their profile, changing avatar, updating bio
3. **Creator Tips**: Help creative users with tips for making engaging animated content
4. **Safety**: Answer questions about privacy, parental controls, and staying safe online
5. **Navigation**: Help users find features like settings, notifications, milestones, etc.
6. **General Questions**: Answer fun questions about animation and cartoons

Key ToonlyReels features to know:
- Two user types: Viewers (watch content) and Creatives (upload content)
- Discovery and Following feeds for finding videos
- Parental controls and screen time limits
- Profile customization with avatars and cover photos
- Milestones system to celebrate achievements
- Save videos for later viewing
- Comments and likes on videos

Always be positive and encourage creativity! If you don't know something specific about the app, suggest checking the Settings page or trying the feature.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await authorize(req, 'user', 'chat');
  if (denied) return denied;

  try {
    const { messages } = await req.json();
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    
    if (!AI_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI assistance is not connected yet' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(`${(Deno.env.get('AI_BASE_URL') || 'https://api.openai.com/v1').replace(/\/$/, '')}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get('AI_MODEL') || 'gpt-4.1-mini',
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ToonlyAI is taking a quick break! Please try again in a moment. 🎬" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "ToonlyAI needs more energy! Please try again later. ⚡" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "ToonlyAI is having trouble right now. Please try again! 🔄" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("ToonlyAI chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Something went wrong! 🤔" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
