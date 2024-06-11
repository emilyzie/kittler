import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { useUser } from '@clerk/clerk-react';
import supabase from '../utils/supabaseClient';
import MovieCard from '../components/MovieCard';
import YouTubeCard from '../components/YoutubeCard';
import ShareWatchlist from '../components/common/ShareWatchlist';
import { arrayMoveImmutable as arrayMove } from 'array-move';
import SearchBar from '../components/SearchBar';
import SearchModal from '../components/SearchModal';

const MediaPage = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [watchlistId, setWatchlistId] = useState('');
  const [watchlistPublic, setWatchlistPublic] = useState(false);
  const { user: clerkUser, isLoaded } = useUser();
  const { watchlistName, watchlistId: paramWatchlistId } = useParams();
  const { state } = useLocation();
  const [openCards, setOpenCards] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const inputRef = useRef(null); // Ref for the search input in the modal

  useEffect(() => {
    if (state && state.successMessage) {
      setSuccessMessage(state.successMessage);
      setShowSuccessMessage(true);
      setTimeout(() => {
        handleCloseSuccessMessage();
      }, 5000);
    }

    async function fetchData() {
      if (isLoaded && clerkUser && paramWatchlistId) {
        try {
          const { data: watchlist, error: watchlistError } = await supabase
            .from('watchlists')
            .select('id, name, is_public')
            .eq('id', paramWatchlistId)
            .single();

          if (watchlistError) {
            throw watchlistError;
          }

          if (watchlist) {
            setWatchlistId(watchlist.id);
            setWatchlistPublic(watchlist.is_public);
            const { data: media, error: mediaError } = await supabase
              .from('media_items')
              .select('*')
              .eq('watchlist_id', watchlist.id)
              .order('order', { ascending: true });

            if (mediaError) {
              throw mediaError;
            }

            setMediaItems(media || []);
          }
        } catch (error) {
          console.error('Error fetching data:', error.message);
        }
      }
    }

    fetchData();
  }, [paramWatchlistId, clerkUser, isLoaded, state]);

  const fetchMediaItems = async () => {
    try {
      const { data: watchlist, error: watchlistError } = await supabase
        .from('watchlists')
        .select('id, name, is_public')
        .eq('id', paramWatchlistId)
        .single();
        
      if (watchlistError) {
        throw watchlistError;
      }

      if (watchlist) {
        setWatchlistId(watchlist.id);
        setWatchlistPublic(watchlist.is_public);
        const { data: media, error: mediaError } = await supabase
          .from('media_items')
          .select('*')
          .eq('watchlist_id', watchlist.id)
          .order('order', { ascending: true });

        if (mediaError) {
          throw mediaError;
        }

        setMediaItems(media || []);
      }
    } catch (error) {
      console.error('Error fetching media items:', error.message);
    }
  };

  const handleNotesChange = async (id, notes) => {
    const { error } = await supabase.from('media_items').update({ notes }).eq('id', id);
    if (error) {
      console.error('Error updating notes:', error.message);
    } else {
      setMediaItems(currentItems => currentItems.map(item => item.id === id ? { ...item, notes } : item));
    }
  };

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase.from('media_items').update({ status }).eq('id', id);
    if (error) {
      console.error('Error updating status:', error.message);
    } else {
      setMediaItems(currentItems => currentItems.map(item => item.id === id ? { ...item, status } : item));
    }
  };

  const handleRatingChange = async (id, rating) => {
    const { error } = await supabase.from('media_items').update({ rating }).eq('id', id);
    if (error) {
      console.error('Error updating rating:', error.message);
    } else {
      setMediaItems(currentItems => currentItems.map(item => item.id === id ? { ...item, rating } : item));
    }
  };

  const setIsOpen = useCallback((id, isOpen) => {
    setOpenCards(prevOpenCards => ({ ...prevOpenCards, [id]: isOpen }));
  }, []);

  const SortableList = ({ items, onDelete }) => (
    <Droppable droppableId={`droppable-${watchlistId}`}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}>
          {items.map((item, index) => (
            <SortableItem key={item.id} item={item} index={index} onDelete={onDelete} />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  const SortableItem = ({ item, index, onDelete }) => (
    <Draggable draggableId={item.id.toString()} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}>
          {item.medium === 'YouTube' ? (
            <YouTubeCard
              key={item.id}
              id={item.id}
              title={item.title}
              medium={item.medium}
              length={item.length}
              date={item.release_date}
              created_at={item.created_at}
              synopsis={item.synopsis}
              image={item.image}
              url={item.url}
              creator={item.creator}
              status={item.status}
              notes={item.notes}
              rating={item.rating}
              onDelete={() => onDelete(item.id, item.medium)}
              onNotesChange={handleNotesChange}
              onStatusChange={handleStatusChange}
              onRatingChange={handleRatingChange}
              index={index}
              isOpen={openCards[item.id] || false}
              setIsOpen={setIsOpen}
              addedBy={clerkUser.username || 'Guest'}
            />
          ) : (
            <MovieCard
              key={item.id}
              id={item.id}
              title={item.title}
              medium={item.medium}
              length={item.length}
              date={item.release_date}
              created_at={item.created_at}
              synopsis={item.synopsis}
              image={item.image}
              url={item.url}
              creator={item.creator}
              status={item.status}
              notes={item.notes}
              rating={item.rating}
              onDelete={() => onDelete(item.id, item.medium)}
              onNotesChange={handleNotesChange}
              onStatusChange={handleStatusChange}
              onRatingChange={handleRatingChange}
              index={index}
              isOpen={openCards[item.id] || false}
              setIsOpen={setIsOpen}
              addedBy={clerkUser.username || 'Guest'}
            />
          )}
        </div>
      )}
    </Draggable>
  );

  const onSortEnd = async (result) => {
    if (!result.destination) return;

    const reorderedItems = arrayMove(mediaItems, result.source.index, result.destination.index);
    setMediaItems(reorderedItems);

    try {
      await Promise.all(reorderedItems.map((item, index) =>
        supabase.from('media_items').update({ order: index }).match({ id: item.id })
      ));
    } catch (error) {
      console.error('Error updating order on backend:', error);
      fetchMediaItems();
    }
  };

  const onShare = async (friendId) => {
    if (!watchlistId) {
      alert('Watchlist ID not available');
      return;
    }

    const { error } = await supabase
      .from('watchlist_shares')
      .insert([{
        watchlist_id: watchlistId,
        shared_with_user_id: friendId,
        permission_type: 'edit'
      }]);

    if (error) {
      console.error('Failed to share watchlist:', error.message);
      alert('Failed to share watchlist.');
    } else {
      alert('Watchlist shared successfully!');
    }
  };

  const handleSelectItem = async (item, type) => {
    let newMedia;
    if (type === 'youtube') {
      const videoUrl = `https://www.youtube.com/watch?v=${item.id.videoId}`;
      const imageUrl = item.snippet.thumbnails.default.url;
      newMedia = await supabase.from('media_items').insert([{
        title: item.snippet.title,
        medium: 'YouTube',
        watchlist_id: watchlistId,
        image: imageUrl,
        url: videoUrl,
        release_date: item.snippet.publishedAt.substring(0, 10),
        creator: item.snippet.channelTitle,
        added_by: clerkUser.username || 'Guest',
        status: 'to consume',
        order: mediaItems.length
      }]).select();
    } else {
      const imageUrl = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '';
      newMedia = await supabase.from('media_items').insert([{
        title: item.title || item.name,
        medium: type === 'movie' ? 'Movie' : 'TV',
        watchlist_id: watchlistId,
        image: imageUrl,
        release_date: item.release_date || '',
        creator: item.director || '',
        added_by: clerkUser.username || 'Guest',
        status: 'to consume',
        order: mediaItems.length
      }]).select();
    }
  
    const { data, error } = newMedia;
    if (error) {
      console.error('Failed to add item:', error.message);
    } else {
      setMediaItems([...mediaItems, ...data]);
    }
  };
  
  const handleDeleteMediaItem = async (deletedId, medium) => {
    if (window.confirm(`Are you sure you want to delete this ${medium}?`)) {
      const { error } = await supabase
        .from('media_items')
        .delete()
        .match({ id: deletedId });

      if (error) {
        console.error('Error deleting media item:', error.message);
      } else {
        setMediaItems(currentMediaItems => currentMediaItems.filter(item => item.id !== deletedId));
      }
    }
  };

  const handleCloseSuccessMessage = () => {
    setShowSuccessMessage(false);
    setTimeout(() => {
      setSuccessMessage('');
    }, 500);
  };

  const handleSearchClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // Add useEffect to handle Command + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  return (
        <div className="container mx-auto p-4 dark:bg-gray-800 dark:text-white relative w-full">
        <div className="flex justify-between items-start mb-4 w-full">
            <div>
            <h1 className="text-5xl font-bold text-white text-left">{watchlistName}</h1>
            <p className="text-sm text-gray-400">{watchlistPublic ? 'Public watchlist' : 'Private watchlist'}</p>
            </div>
            <div className="search-bar-container">
            <SearchBar onSearchClick={handleSearchClick} />
            </div>
        </div>
        {showSuccessMessage && (
            <div className="alert alert-success w-full">
            {successMessage}
            </div>
        )}
        <DragDropContext onDragEnd={onSortEnd}>
            <SortableList items={mediaItems} onDelete={(id, medium) => handleDeleteMediaItem(id, medium)} />
        </DragDropContext>
        {isModalOpen && <SearchModal onSelect={handleSelectItem} onClose={handleModalClose} inputRef={inputRef} />}
        </div>

  );
};

export default MediaPage;
