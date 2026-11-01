export const SEGMENTS_STORAGE_KEY = 'mall-insight-segments';
export const SEGMENTS_UPDATED_EVENT = 'mall-insight:segments-updated';

export function getSavedSegments() {
  try {
    const saved = localStorage.getItem(SEGMENTS_STORAGE_KEY);
    const segments = saved ? JSON.parse(saved) : [];

    return Array.isArray(segments) ? segments : [];
  } catch (error) {
    console.error('Ошибка чтения сегментов:', error);
    return [];
  }
}

export function saveSegment(segment) {
  const segments = getSavedSegments();
  const savedSegment = {
    ...segment,
    id: segment.id || crypto.randomUUID(),
    updatedAt: new Date().toISOString()
  };

  const updatedSegments = segment.id
    ? segments.map((item) =>
      item.id === segment.id ? savedSegment : item
    )
    : [savedSegment, ...segments];

  localStorage.setItem(
    SEGMENTS_STORAGE_KEY,
    JSON.stringify(updatedSegments)
  );
  window.dispatchEvent(new CustomEvent(SEGMENTS_UPDATED_EVENT));

  return savedSegment;
}

export function removeSegment(segmentId) {
  const updatedSegments = getSavedSegments().filter(
    (segment) => segment.id !== segmentId
  );

  localStorage.setItem(
    SEGMENTS_STORAGE_KEY,
    JSON.stringify(updatedSegments)
  );
  window.dispatchEvent(new CustomEvent(SEGMENTS_UPDATED_EVENT));
}
