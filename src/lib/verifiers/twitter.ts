/**
 * Twitter/X 验证器
 * 使用 Nitter 和其他代理抓取推文内容
 */

const PROXY_INSTANCES = [
  // Nitter instances
  'nitter.poast.org',
  'nitter.privacydev.net',
  // Alternative frontends
  'xcancel.com',
  'sotwe.com',
  'twstalker.com',
];

interface VerificationResult {
  success: boolean;
  error?: string;
  instance?: string;
}

/**
 * 从 Twitter URL 提取用户名和推文 ID
 */
function extractTweetInfo(url: string): { username: string; tweetId: string } | null {
  // 匹配 twitter.com/user/status/123 或 x.com/user/status/123
  const match = url.match(/(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/);
  if (!match) return null;
  return { username: match[1], tweetId: match[2] };
}

/**
 * 验证 Twitter URL 是否包含验证码
 */
export async function verifyTwitter(
  url: string,
  code: string
): Promise<VerificationResult> {
  // 提取用户名和推文 ID
  const tweetInfo = extractTweetInfo(url);
  if (!tweetInfo) {
    return { 
      success: false, 
      error: 'Invalid Twitter URL format' 
    };
  }

  const { username, tweetId } = tweetInfo;
  console.log(`🔍 Extracted from URL: username=${username}, tweetId=${tweetId}`);
  console.log(`🔍 Will try ${PROXY_INSTANCES.length} proxy instances`);

  // 尝试多个代理实例
  for (const instance of PROXY_INSTANCES) {
    try {
      // 根据实例类型构建不同的URL
      let proxyUrl: string
      
      if (instance.includes('nitter') || instance === 'xcancel.com') {
        proxyUrl = `https://${instance}/${username}/status/${tweetId}`
      } else {
        proxyUrl = `https://${instance}/${username}/status/${tweetId}`
      }
      
      console.log(`🔍 Trying proxy: ${proxyUrl}`);
      
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.warn(`   ❌ ${instance} failed: ${response.status}`);
        continue;
      }

      const html = await response.text();
      console.log(`   ✅ Fetched ${html.length} characters from ${instance}`);

      // 检查验证码
      if (html.includes(code)) {
        console.log(`   🎉 VERIFICATION CODE FOUND via ${instance}!`);
        return { 
          success: true, 
          instance 
        };
      } else {
        console.warn(`   ⚠️ Code "${code}" not found in ${instance}`);
      }
    } catch (error) {
      console.error(`   ❌ ${instance} error:`, error);
      continue;
    }
  }

  console.error(`❌ All ${PROXY_INSTANCES.length} proxy instances failed`);
  return { 
    success: false, 
    error: 'All proxy instances failed. Twitter/X verification is unreliable. Please try using a different platform (GitHub, 微博, 知乎) for verification.' 
  };
}

/**
 * 验证多平台 URL
 */
export async function verifyURL(
  url: string,
  code: string
): Promise<VerificationResult> {
  // 检测平台
  if (url.includes('twitter.com') || url.includes('x.com')) {
    return verifyTwitter(url, code);
  }

  // 其他平台（直接抓取）
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OPC-Platform-Verifier/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { 
        success: false, 
        error: `Failed to fetch URL: ${response.status}` 
      };
    }

    const content = await response.text();

    if (content.includes(code)) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Verification code not found in URL content' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: `Failed to verify URL: ${error}` 
    };
  }
}
