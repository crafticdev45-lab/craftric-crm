import { useAuth } from '../context/AuthContext';

interface LastModifiedProps {
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  createdBy?: string;
  createdAt?: string;
  className?: string;
}

export function LastModified({ lastModifiedBy, lastModifiedAt, createdBy, createdAt, className = '' }: LastModifiedProps) {
  const { users } = useAuth();
  const modifier = lastModifiedBy ? users.find(u => u.id === lastModifiedBy) : null;
  const creator = createdBy ? users.find(u => u.id === createdBy) : null;

  if (!lastModifiedAt && !createdAt && !createdBy) return null;

  return (
    <div className={`text-xs text-gray-500 space-y-0.5 ${className}`}>
      {lastModifiedAt && (
        <p>
          Last modified: {new Date(lastModifiedAt).toLocaleDateString()} {new Date(lastModifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {modifier && ` by ${modifier.name}`}
        </p>
      )}
      {createdAt && (
        <p>
          Created: {new Date(createdAt).toLocaleDateString()}
          {creator && ` by ${creator.name}`}
        </p>
      )}
      {!createdAt && createdBy && creator && (
        <p>Created by {creator.name}</p>
      )}
    </div>
  );
}
