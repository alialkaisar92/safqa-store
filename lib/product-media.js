'use strict';

function parseStringValue(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return [];
  if ((text.startsWith('[') && text.endsWith(']')) || (text.startsWith('{') && text.endsWith('}'))) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) {}
  }
  return [text];
}

function flatten(values, out = []) {
  for (const value of Array.isArray(values) ? values : [values]) {
    if (value == null || value === '') continue;
    if (Array.isArray(value)) {
      flatten(value, out);
      continue;
    }
    if (typeof value === 'object') {
      const candidate = value.url || value.href || value.src || value.path || value.link || value.file || value.video_url || value.videoUrl;
      if (candidate) flatten(candidate, out);
      continue;
    }
    parseStringValue(value).forEach(item => {
      if (Array.isArray(item) || (item && typeof item === 'object')) flatten(item, out);
      else out.push(String(item).trim());
    });
  }
  return out;
}

function secureUrl(value) {
  const text = String(value || '').trim();
  if (!/^https:\/\//i.test(text)) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function uniqueUrls(values) {
  const seen = new Set();
  const result = [];
  for (const value of flatten(values)) {
    const url = secureUrl(value);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function isDriveUrl(value) {
  try {
    const host = new URL(String(value)).hostname.toLowerCase();
    return host === 'drive.google.com' || host.endsWith('.drive.google.com') || host === 'docs.google.com' || host.endsWith('.docs.google.com');
  } catch (_) {
    return false;
  }
}

function isVideoUrl(value) {
  return /\.(?:mp4|webm|mov|m4v|ogv|m3u8)(?:[?#].*)?$/i.test(String(value || '')) || /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(String(value || ''));
}

function productMedia(product) {
  const value = product && typeof product === 'object' ? product : {};
  const images = uniqueUrls([
    value.image,
    value.images,
    value.photos,
    value.pictures,
    value.gallery,
    value.mediaImages,
    value.media_images
  ]).filter(url => !isVideoUrl(url)).slice(0, 12);
  const explicitVideoLinks = uniqueUrls([
    value.mediaVideo,
    value.media_video,
    value.video,
    value.video_url,
    value.videoUrl,
    value.videos
  ]).filter(url => !isDriveUrl(url));
  const genericLinks = uniqueUrls([
    value.media_url,
    value.mediaUrl,
    value.media,
    value.media_link,
    value.mediaLink,
    value.drive_url,
    value.driveUrl
  ]);
  const driveUrl = genericLinks.find(isDriveUrl) || null;
  const videos = uniqueUrls([
    explicitVideoLinks,
    genericLinks.filter(url => !isDriveUrl(url) && isVideoUrl(url))
  ]).slice(0, 6);
  const links = uniqueUrls([
    genericLinks.filter(url => !isDriveUrl(url) && !isVideoUrl(url))
  ]).slice(0, 8);
  return { images, videos, links, driveUrl, mediaUrl: driveUrl || genericLinks[0] || null };
}

module.exports = { productMedia, isDriveUrl, isVideoUrl, secureUrl };
