import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const WatchlistPage = () => {
    const [watchlists, setWatchlists] = useState([]);
    const [watchlistName, setWatchlistName] = useState('');
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                navigate('/login');
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('Error fetching user data:', error.message);
                navigate('/');
            } else {
                setUsername(profile.username);
                fetchWatchlists(user.id);
            }
        };

        fetchUserData();
    }, [navigate]);

    const fetchWatchlists = async (userId) => {
        const { data, error } = await supabase
            .from('watchlists')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching watchlists:', error.message);
        } else {
            setWatchlists(data);
        }
    };

    const createWatchlist = async () => {
        if (!watchlistName) return;

        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('watchlists')
            .insert([{ name: watchlistName, user_id: user.id }]);

        if (error) {
            console.error('Error creating watchlist:', error.message);
        } else {
            setWatchlists([...watchlists, ...data]); // Update local state with new watchlist
            navigate(`/${username}/${watchlistName}`);
            setWatchlistName(''); // Clear the field after creation
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-xl font-bold">Your Watchlists</h1>
            {watchlists.map((list) => (
                <div key={list.id} className="p-2 border-b">
                    <button className="text-blue-500 hover:text-blue-600" onClick={() => navigate(`/list/${username}/${list.name}`)}>
                        {list.name}
                    </button>
                </div>
            ))}
            <div>
                <input
                    type="text"
                    value={watchlistName}
                    onChange={(e) => setWatchlistName(e.target.value)}
                    placeholder="Enter Watchlist Name"
                    className="border p-2 mt-4"
                />
                <button onClick={createWatchlist} className="ml-2 bg-blue-500 text-white p-2 rounded">
                    Create Watchlist
                </button>
            </div>
        </div>
    );
};

export default WatchlistPage;