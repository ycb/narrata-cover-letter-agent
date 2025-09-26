import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { access_token } = await req.json();
    
    if (!access_token) {
      return new Response(
        JSON.stringify({ error: 'Access token is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('LinkedIn fetch data request received');
    console.log('Access token length:', access_token.length);

    // Try Member Data Portability API first (for EEA users)
    let testResponse = await fetch('https://api.linkedin.com/v2/memberSnapshot', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      }
    });

    // If Member Data Portability API fails, fall back to basic LinkedIn API (for non-EEA users)
    if (!testResponse.ok && testResponse.status === 403) {
      console.log('Member Data Portability API not available, falling back to basic LinkedIn API');
      testResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Test memberSnapshot response status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('Test memberSnapshot failed:', errorText);
      return new Response(
        JSON.stringify({ 
          error: `Profile fetch failed: ${testResponse.status} ${testResponse.statusText}`,
          details: errorText
        }),
        { 
          status: testResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch member data - handle both Member Data Portability API and basic LinkedIn API
    const memberData = await testResponse.json();
    console.log('LinkedIn data received:', memberData);

    let profileData, positionsData, educationData, skillsData;

    // Check if this is Member Data Portability API response (EEA users)
    if (memberData.profile || memberData.positions || memberData.experience) {
      console.log('Using Member Data Portability API data (EEA user)');
      profileData = memberData.profile || memberData;
      positionsData = { elements: memberData.positions || memberData.experience || [] };
      educationData = { elements: memberData.education || [] };
      skillsData = { elements: memberData.skills || [] };
    } else {
      console.log('Using basic LinkedIn API data (Non-EEA user)');
      profileData = memberData;
      
      // For non-EEA users, we'll need to make additional API calls for detailed data
      // Try to fetch positions, education, and skills separately
      const [positionsResponse, educationResponse, skillsResponse] = await Promise.allSettled([
        fetch('https://api.linkedin.com/v2/me/positions', {
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch('https://api.linkedin.com/v2/me/educations', {
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        }),
        fetch('https://api.linkedin.com/v2/me/skills', {
          headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' }
        })
      ]);

      positionsData = { elements: positionsResponse.status === 'fulfilled' && positionsResponse.value.ok 
        ? (await positionsResponse.value.json()).elements || [] : [] };
      educationData = { elements: educationResponse.status === 'fulfilled' && educationResponse.value.ok 
        ? (await educationResponse.value.json()).elements || [] : [] };
      skillsData = { elements: skillsResponse.status === 'fulfilled' && skillsResponse.value.ok 
        ? (await skillsResponse.value.json()).elements || [] : [] };
    }

    console.log('Extracted data:', {
      profile: !!profileData,
      positions: positionsData.elements?.length || 0,
      education: educationData.elements?.length || 0,
      skills: skillsData.elements?.length || 0
    });

    // Return combined data
    const result = {
      profile: profileData,
      positions: positionsData.elements || [],
      education: educationData.elements || [],
      skills: skillsData.elements || []
    };

    console.log('Returning combined data:', {
      profile: !!result.profile,
      positions: result.positions.length,
      education: result.education.length,
      skills: result.skills.length
    });

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('LinkedIn fetch data error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
