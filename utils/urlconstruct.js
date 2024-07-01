export function replaceAllButLast(str, search, replace) {
    // Split the string by the search term
    const parts = str.split(search);
  
    // Join all parts except the last one with the replace term
    const result = parts.slice(0, -1).join(replace);
  
    // Append the last part without any replacement
    return result + (parts.length > 1 ? search + parts[parts.length - 1] : '');
  }