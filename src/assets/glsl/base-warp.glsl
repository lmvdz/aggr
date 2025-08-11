precision mediump float;

// Include all available colormaps

#include colormaps/alpha.glsl;
#include colormaps/autumn.glsl;
#include colormaps/bathymetry.glsl;
#include colormaps/blackbody.glsl;
#include colormaps/bluered.glsl;
#include colormaps/bone.glsl;
#include colormaps/cdom.glsl;
#include colormaps/chlorophyll.glsl;
#include colormaps/cool.glsl;
#include colormaps/copper.glsl;
#include colormaps/cubehelix.glsl;
#include colormaps/density.glsl;
#include colormaps/earth.glsl;
#include colormaps/electric.glsl;
#include colormaps/freesurface-blue.glsl;
#include colormaps/freesurface-red.glsl;
#include colormaps/greens.glsl;
#include colormaps/greys.glsl;
#include colormaps/hot.glsl;
#include colormaps/hsv.glsl;
#include colormaps/inferno.glsl;
#include colormaps/jet.glsl;
#include colormaps/magma.glsl;
#include colormaps/oxygen.glsl;
#include colormaps/par.glsl;
#include colormaps/phase.glsl;
#include colormaps/picnic.glsl;
#include colormaps/plasma.glsl;
#include colormaps/portland.glsl;
#include colormaps/rainbow-soft.glsl;
#include colormaps/rainbow.glsl;
#include colormaps/rdbu.glsl;
#include colormaps/salinity.glsl;
#include colormaps/spring.glsl;
#include colormaps/summer.glsl;
#include colormaps/temperature.glsl;
#include colormaps/turbidity.glsl;
#include colormaps/velocity-blue.glsl;
#include colormaps/velocity-green.glsl;
#include colormaps/viridis.glsl;
#include colormaps/warm.glsl;
#include colormaps/winter.glsl;
#include colormaps/yignbu.glsl;
#include colormaps/yiorrd.glsl;

#define PI 3.1415926538



uniform int         i_colormap;

uniform vec2        u_resolution;          // viewport resolution (in pixels)
uniform vec2        u_mouse;
uniform float       u_time;                // shader playback time (in seconds)
uniform float       u_delta;               // render time (in seconds)
uniform bool        b_warp; 
uniform bool        b_displace;

uniform sampler2D   u_texture;
uniform vec2        u_textureResolution;

uniform sampler2D   u_canvas;
uniform vec2        u_canvasResolution;

uniform float       u_maskThreshold; // e.g. 0.20
uniform float       u_maskSoftness;  // e.g. 0.08


vec2 scale(vec2 st, float s) {
    return (st-.5)*s+.5;
}

vec2 ratio(in vec2 st, in vec2 s) {
    return mix( vec2((st.x*s.x/s.y)-(s.x*.5-s.y*.5)/s.y,st.y),
                vec2(st.x,st.y*(s.y/s.x)-(s.y*.5-s.x*.5)/s.x),
                step(s.x,s.y));
}

// Function to get a colormap by index with smooth transitions
// vec4 getColormap(float x, int index) {
//     if (index == 0) return yignbu(x);
//     else if (index == 1) return autumn(x);
//     else if (index == 2) return bathymetry(x);
//     else if (index == 3) return blackbody(x);
//     else if (index == 4) return bluered(x);
//     else if (index == 5) return bone(x);
//     else if (index == 6) return cdom(x);
//     else if (index == 7) return chlorophyll(x);
//     else if (index == 8) return cool(x);
//     else if (index == 9) return copper(x);
//     else if (index == 10) return cubehelix(x);
//     else if (index == 11) return density(x);
//     else if (index == 12) return earth(x);
//     else if (index == 13) return electric(x);
//     else if (index == 14) return freesurface_blue(x);
//     else if (index == 15) return freesurface_red(x);
//     else if (index == 16) return greens(x);
//     else if (index == 17) return greys(x);
//     else if (index == 18) return hot(x);
//     else if (index == 19) return hsv(x);
//     else if (index == 20) return inferno(x);
//     else if (index == 21) return yiorrd(x);
//     else if (index == 22) return magma(x);
//     else if (index == 23) return oxygen(x);
//     else if (index == 24) return par(x);
//     else if (index == 25) return phase(x);
//     else if (index == 26) return picnic(x);
//     else if (index == 27) return plasma(x);
//     else if (index == 28) return portland(x);
//     else if (index == 29) return rainbow_soft(x);
//     else if (index == 30) return rainbow(x);
//     else if (index == 31) return rdbu(x);
//     else if (index == 32) return salinity(x);
//     else if (index == 33) return spring(x);
//     else if (index == 34) return summer(x);
//     else if (index == 35) return temperature(x);
//     else if (index == 36) return turbidity(x);
//     else if (index == 37) return velocity_blue(x);
//     else if (index == 38) return velocity_green(x);
//     else if (index == 39) return viridis(x);
//     else if (index == 40) return warm(x);
//     else return winter(x);
// }

// int modI(int a,int b) {
//     int m=a-a/b*b;
//     return m;
// }

// Smooth colormap transition function
// vec4 smoothColormapTransition(float x, float time) {
//     const int numColormaps = 41;
//     float cycleTime = 3.14; // Time in seconds for each colormap
//     float totalCycleTime = float(numColormaps) * cycleTime;

//     // Normalize time to cycle through all colormaps
//     float normalizedTime = mod(time, totalCycleTime) / cycleTime;

//     int currentIndex = int(floor(normalizedTime));
//     int nextIndex = modI((currentIndex + 1), numColormaps);
//     float blend = fract(normalizedTime);

//     // Smooth the blend factor for smoother transitions
//     blend = smoothstep(0.0, 1.0, blend);

//     vec4 currentColor = getColormap(x, currentIndex);
//     vec4 nextColor = getColormap(x, nextIndex);

//     return mix(currentColor, nextColor, blend);
// }

// https://iquilezles.org/articles/warp
/*float noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float a = textureLod(iChannel0,(p+vec2(0.5,0.5))/256.0,0.0).x;
    float b = textureLod(iChannel0,(p+vec2(1.5,0.5))/256.0,0.0).x;
    float c = textureLod(iChannel0,(p+vec2(0.5,1.5))/256.0,0.0).x;
    float d = textureLod(iChannel0,(p+vec2(1.5,1.5))/256.0,0.0).x;
    return mix(mix( a, b,f.x), mix( c, d,f.x),f.y);
}*/


float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}


float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

const mat2 mtx = mat2( 0.80,  0.60, -0.60,  0.80 );

float fbm( vec2 p )
{
    // Normalize mouse coordinates to [-1, 1] range
    vec2 mouse = (u_mouse / u_resolution) * 2.0 - 1.0;

    // Use mouse to create directional flow and scale
    float mouseInfluence = length(mouse) * 0.5;
    vec2 mouseOffset = mouse * 0.3;

    float f = 0.0;

    f += 0.500000*noise( p + u_time * 0.3 ); p = mtx*p*2.02;
    f += 0.031250*noise( p + mouseOffset * 0.5 ); p = mtx*p*2.01;
    f += 0.250000*noise( p + mouseOffset * 0.8 ); p = mtx*p*2.03;
    f += 0.125000*noise( p + mouseOffset * 1.2 ); p = mtx*p*2.01;
    f += 0.062500*noise( p + mouseOffset * 1.5 ); p = mtx*p*2.04;
    f += 0.015625*noise( p + sin(u_time * 0.2 + mouseInfluence) + mouseOffset );

    return f/0.96875;
}

float pattern( in vec2 p )
{
    // Normalize mouse coordinates and create mouse-based distortion
    vec2 mouse = (u_mouse / u_resolution) * 2.0 - 1.0;

    // Create mouse-influenced warping
    vec2 mouseWarp = mouse * 0.2;
    float mouseRotation = (mouse.y + 1.0 + mouse.x) * 0.5 * 2.0 * PI * 0.1; // smooth from 0 to ~0.63 radians

    // Apply mouse influence to the warping pattern
    return fbm( p + mouseWarp + fbm( p + mouseRotation + fbm( p + mouseWarp * 0.5 ) ) );
}


vec4 colormap(float x) {
    if (i_colormap ==  0) return alpha(x);
    else if (i_colormap ==  1) return autumn(x);
    else if (i_colormap ==  2) return bathymetry(x);
    else if (i_colormap ==  3) return blackbody(x);
    else if (i_colormap ==  4) return bluered(x);
    else if (i_colormap ==  5) return bone(x);
    else if (i_colormap ==  6) return cdom(x);
    else if (i_colormap ==  7) return chlorophyll(x);
    else if (i_colormap ==  8) return cool(x);
    else if (i_colormap ==  9) return copper(x);
    else if (i_colormap == 10) return cubehelix(x);
    else if (i_colormap == 11) return density(x);
    else if (i_colormap == 12) return earth(x);
    else if (i_colormap == 13) return electric(x);
    else if (i_colormap == 14) return freesurface_blue(x);
    else if (i_colormap == 15) return freesurface_red(x);
    else if (i_colormap == 16) return greens(x);
    else if (i_colormap == 17) return greys(x);
    else if (i_colormap == 18) return hot(x);
    else if (i_colormap == 19) return hsv(x);
    else if (i_colormap == 20) return inferno(x);
    else if (i_colormap == 21) return jet(x);
    else if (i_colormap == 22) return magma(x);
    else if (i_colormap == 23) return oxygen(x);
    else if (i_colormap == 24) return par(x);
    else if (i_colormap == 25) return phase(x);
    else if (i_colormap == 26) return picnic(x);
    else if (i_colormap == 27) return plasma(x);
    else if (i_colormap == 28) return portland(x);
    else if (i_colormap == 29) return rainbow_soft(x);
    else if (i_colormap == 30) return rainbow(x);
    else if (i_colormap == 31) return rdbu(x);
    else if (i_colormap == 32) return salinity(x);
    else if (i_colormap == 33) return spring(x);
    else if (i_colormap == 34) return summer(x);
    else if (i_colormap == 35) return temperature(x);
    else if (i_colormap == 36) return turbidity(x);
    else if (i_colormap == 37) return velocity_blue(x);
    else if (i_colormap == 38) return velocity_green(x);
    else if (i_colormap == 39) return viridis(x);
    else if (i_colormap == 40) return warm(x);
    else if (i_colormap == 41) return winter(x);
    else if (i_colormap == 42) return yignbu(x);
    else if (i_colormap == 43) return yiorrd(x);
    else return vec4(0.0);          // fallback
}

float candleMask(vec2 uv) {
    // Early reject: nothing drawn
    float a = texture2D(u_canvas, uv).a;
    if (a < 0.01) return 0.0;

    // Neighborhood thickness test (3x3 box)
    vec2 px = 1.0 / u_canvasResolution;
    float s = 0.0;
    for (int j=-1; j<=1; ++j)
    for (int i=-1; i<=1; ++i) {
        s += texture2D(u_canvas, uv + vec2(float(i), float(j)) * px).a;
    }
    float avg = s / 9.0;
    // Gridlines (1 px) keep avg low; candle bodies/wicks push it higher
    return smoothstep(u_maskThreshold - u_maskSoftness, u_maskThreshold + u_maskSoftness, avg);
}

void main()
{

    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    float shade = pattern(uv);

    // vec3 color = smoothColormapTransition(shade, u_time).rgb;
    vec3 color = colormap(shade).rgb;

    vec4 src = texture2D(u_canvas, uv);              // the original chart pixels
    float mask = candleMask(uv);                     // 0..1
    float lum = dot(src.rgb, vec3(0.299,0.587,0.114));
    mask *= smoothstep(0.05, 0.10, lum);

    vec3 outRgb = mix(src.rgb, color, mask);
    outRgb += color.rgb*0.245;

    // Center the logo and scale it down
    vec2 logoUV = (uv - 0.5) * 5.0 + 0.5; // Make logo smaller by stretching UV coordinates

    // Apply aspect ratio correction to maintain logo's correct proportions
    float screenAspect = u_resolution.x / u_resolution.y;
    float textureAspect = u_textureResolution.x / u_textureResolution.y;

    // Adjust logoUV to maintain texture's aspect ratio regardless of screen aspect ratio
    logoUV = (logoUV - 0.5) * vec2(screenAspect / textureAspect, 1.0) + 0.5;

    // Apply organic flow displacement to the logo
    // Use the same pattern function but at a different scale for subtle displacement
    float logoFlowX = pattern(logoUV * 3.0 + vec2(u_time * 0.05, 0.0)) * 0.02;
    float logoFlowY = pattern(logoUV * 3.0 + vec2(0.0, u_time * 0.05)) * 0.02;
    vec2 flowDisplacement = vec2(logoFlowX, logoFlowY);

    // Add gravity-like warping based on mouse position
    vec2 mouseUV = u_mouse / u_resolution; // Normalize mouse to [0,1]

    // Calculate distance from mouse to current screen pixel (not logo pixel)
    vec2 mouseToScreenPixel = uv - mouseUV;
    float distanceToMouse = length(mouseToScreenPixel);

    // Only apply gravity if mouse is close to this screen area
    float gravityRadius = 0.2; // Radius of influence in screen space
    float gravityStrength = 0.3; // Adjust this to control intensity

    vec2 gravityDisplacement = vec2(0.0);

    // Only calculate gravity if mouse is within influence radius
    if (distanceToMouse < gravityRadius) {
        // Calculate gravity force (inverse square law, but clamped for stability)
        float gravityForce = gravityStrength / (distanceToMouse * distanceToMouse + 0.01);
        gravityForce = min(gravityForce, 3.0); // Clamp maximum force

        // Apply smooth falloff based on distance
        float falloff = smoothstep(gravityRadius, 0.0, distanceToMouse);
        gravityForce *= falloff;

        // Calculate direction towards mouse (attraction)
        vec2 gravityDirection = normalize(-mouseToScreenPixel); // Negative for attraction
        gravityDisplacement = gravityDirection * gravityForce * 0.03;
    }

    // NEW EFFECT: Bounded pixel blending (the new warping effect)
    vec4 logoSample = texture2D(u_texture, logoUV);

    // Combine organic flow with gravity warping
    vec2 totalDisplacement = flowDisplacement + gravityDisplacement;

    // OLD EFFECT: Direct UV displacement - UNBOUNDED (can sample anywhere!)
    vec2 displacedLogoUV = logoUV + totalDisplacement;
    vec4 directDisplacedSample = b_displace ? texture2D(u_texture, displacedLogoUV) : logoSample;

    // Create a warping effect by sampling nearby pixels - ALSO UNBOUNDED
    vec2 offset1 = totalDisplacement * 0.5;
    vec2 offset2 = totalDisplacement * -0.3;

    // Sample additional points WITHOUT bounds checking (let them sample anywhere)
    vec4 warpSample1 = texture2D(u_texture, logoUV + offset1);
    vec4 warpSample2 = texture2D(u_texture, logoUV + offset2);

    // Blend the samples to create warping effect
    vec4 warpedLogo = b_warp ? mix(mix(logoSample, warpSample1, 0.3), warpSample2, 0.2) : logoSample;

    // COMBINE BOTH EFFECTS: Mix the direct displacement with the bounded blending
    float displacementMagnitude = length(totalDisplacement);
    float blendFactor = smoothstep(0.0, 0.05, displacementMagnitude); // More blending with stronger displacement

    vec4 finalLogo = mix(directDisplacedSample, warpedLogo, blendFactor * 0.6);

    // Apply the falloff to the final logo alpha
    // Only show logo when original UV coordinates are within bounds (prevents tiling)
    if (!(logoUV.x >= 0.0 && logoUV.x <= 1.0 && logoUV.y >= 0.0 && logoUV.y <= 1.0)) {
        // Apply exponential falloff from center (0.5, 0.5) instead of hard bounds
        vec2 centerOffset = logoUV - vec2(0.5, 0.5);
        float distanceFromCenter = length(centerOffset);

        // Exponential falloff - adjust the multiplier to control falloff rate
        float falloffRate = 1.0; // Higher = steeper falloff
        float alphaFalloff = exp(-distanceFromCenter * falloffRate);

        finalLogo.a *= alphaFalloff;
    }
    

    // Mix finalLogo with shade for interesting blending effects
    vec3 logoWithShade = mix(finalLogo.rgb, vec3(shade), 0.3); // Blend logo colors with shade
    outRgb += logoWithShade * finalLogo.a*0.8;

    outRgb += src.rgb;

    
    gl_FragColor = vec4(outRgb, shade);
}